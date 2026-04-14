# ble_runner.py
import os
import time
import asyncio
import traceback
from typing import Dict, Any

# Only power-cycle bluetooth in real BLE mode
SIM_MODE = os.getenv("SIM_MODE", "0") == "1"
if not SIM_MODE:
    os.system("bluetoothctl power off; sleep 1; bluetoothctl power on")

from bleak import BleakScanner, BleakClient

# ===== BLE Characteristic UUIDs =====
UUID_0036 = "ce060036-43e5-11e4-916c-0800200c9a66"  # Notify characteristic
UUID_WRITE = "ce060034-43e5-11e4-916c-0800200c9a66"  # Write characteristic

# ===== Public state consumed by API/frontend =====
ble_state = {
    "power": 0,
    "cadence": 0.0,
    "elapsed": 0.0,
    "distance": 0.0,
    "energy_kwh": 0.0,
    "session_active": False,
    "connected": False,
}

# ===== Internal tracking =====
_last_stroke_t = None
_stroke_intervals = []
_last_notify_t = None
_last_notified_power = 0
_start_t = None

# ===== Real BLE tunables =====
DISTANCE_PER_STROKE = float(os.getenv("DISTANCE_PER_STROKE", "6.0"))
SCAN_INTERVAL = float(os.getenv("SCAN_INTERVAL", "5.0"))
RETRY_TIMEOUT = float(os.getenv("RETRY_TIMEOUT", "300"))
INITIAL_BOOT_DELAY = float(os.getenv("INITIAL_BOOT_DELAY", "20"))

TICK_SECONDS = float(os.getenv("TICK_SECONDS", "0.2"))
POWER_HOLD_SEC = float(os.getenv("POWER_HOLD_SEC", "0.75"))
POWER_DECAY_WINDOW = float(os.getenv("POWER_DECAY_WINDOW", "2.0"))
CADENCE_IDLE_SEC = float(os.getenv("CADENCE_IDLE_SEC", "2.0"))

MAX_STROKE_HISTORY = 5
MIN_STROKE_INTERVAL = 0.3
MAX_STROKE_INTERVAL = 5.0

# ===== Simulation tunables =====
SIM_TICK_SECONDS = float(os.getenv("SIM_TICK_SECONDS", "0.2"))
SIM_DEFAULT_POWER = float(os.getenv("SIM_DEFAULT_POWER", "160"))
SIM_DEFAULT_CADENCE = float(os.getenv("SIM_DEFAULT_CADENCE", "90"))
SIM_PROFILE = os.getenv("SIM_PROFILE", "constant")  # constant | ramp
SIM_RAMP_MIN_POWER = float(os.getenv("SIM_RAMP_MIN_POWER", "60"))
SIM_RAMP_MAX_POWER = float(os.getenv("SIM_RAMP_MAX_POWER", "220"))
SIM_RAMP_PERIOD_SEC = float(os.getenv("SIM_RAMP_PERIOD_SEC", "30"))

# Manual simulation controls
_sim_controls: Dict[str, Any] = {
    "manual_power": None,
    "manual_cadence": None,
    "manual_energy": None,
    "manual_distance": None,
    "profile": SIM_PROFILE,
}


def _now_mono():
    return time.monotonic()


def to_uint16_le(b: bytes) -> int:
    return b[0] + (b[1] << 8)


def reset_session_metrics():
    """Reset session counters but keep connectivity/session_active as caller decides."""
    ble_state.update({
        "power": 0,
        "cadence": 0.0,
        "elapsed": 0.0,
        "distance": 0.0,
        "energy_kwh": 0.0,
    })


def reset_test_state():
    """Reset manual simulation overrides."""
    _sim_controls.update({
        "manual_power": None,
        "manual_cadence": None,
        "manual_energy": None,
        "manual_distance": None,
        "profile": SIM_PROFILE,
    })


def set_simulated_power(value: float | None):
    _sim_controls["manual_power"] = None if value is None else float(value)


def set_simulated_cadence(value: float | None):
    _sim_controls["manual_cadence"] = None if value is None else float(value)


def set_simulated_energy(value: float | None):
    _sim_controls["manual_energy"] = None if value is None else float(value)


def set_simulated_distance(value: float | None):
    _sim_controls["manual_distance"] = None if value is None else float(value)


def set_simulation_profile(profile: str):
    if profile not in {"constant", "ramp"}:
        raise ValueError("profile must be 'constant' or 'ramp'")
    _sim_controls["profile"] = profile


def get_simulation_status():
    return {
        "sim_mode": SIM_MODE,
        "profile": _sim_controls["profile"],
        "manual_power": _sim_controls["manual_power"],
        "manual_cadence": _sim_controls["manual_cadence"],
        "manual_energy": _sim_controls["manual_energy"],
        "manual_distance": _sim_controls["manual_distance"],
    }


def notification_handler(_, data: bytes):
    """Handle incoming PM5 notifications (UUID 0x0036)."""
    global _last_stroke_t, _stroke_intervals, _last_notify_t, _last_notified_power, _start_t
    now = _now_mono()
    if not _start_t:
        return

    power = to_uint16_le(data[3:5])
    _last_notified_power = int(power)
    _last_notify_t = now

    if power > 0:
        if _last_stroke_t:
            interval = now - _last_stroke_t
            if MIN_STROKE_INTERVAL < interval < MAX_STROKE_INTERVAL:
                _stroke_intervals.append(interval)
                if len(_stroke_intervals) > MAX_STROKE_HISTORY:
                    _stroke_intervals.pop(0)
        _last_stroke_t = now

    if _stroke_intervals:
        avg = sum(_stroke_intervals) / len(_stroke_intervals)
        if avg > 0:
            ble_state["cadence"] = round(60.0 / avg, 1)


def build_sleep_command(doze_sec=0, sleep_sec=65535):
    doze_hi, doze_lo = (doze_sec >> 8) & 0xFF, doze_sec & 0xFF
    sleep_hi, sleep_lo = (sleep_sec >> 8) & 0xFF, sleep_sec & 0xFF
    body = [0x21, doze_hi, doze_lo, sleep_hi, sleep_lo, 0, 0, 0, 0]
    length = len(body)
    return bytearray([0xF0, length] + body + [0xF2])


def _simulation_profile_power(elapsed_session: float) -> float:
    profile = _sim_controls["profile"]

    if profile == "ramp":
        # Smooth triangle-wave style power for UI testing
        period = max(SIM_RAMP_PERIOD_SEC, 1.0)
        phase = (elapsed_session % period) / period
        if phase < 0.5:
            frac = phase / 0.5
        else:
            frac = (1.0 - phase) / 0.5
        return SIM_RAMP_MIN_POWER + frac * (SIM_RAMP_MAX_POWER - SIM_RAMP_MIN_POWER)

    return SIM_DEFAULT_POWER


async def simulated_logger():
    """
    Dev-only simulated metric source.
    Uses the same ble_state structure as real BLE so the frontend remains unchanged.
    """
    print("🧪 Simulation mode enabled.")
    ble_state["connected"] = True
    reset_test_state()
    reset_session_metrics()

    prev = _now_mono()

    while True:
        await asyncio.sleep(SIM_TICK_SECONDS)
        now = _now_mono()
        dt = now - prev
        if dt <= 0:
            prev = now
            continue

        if ble_state["session_active"]:
            base_power = _simulation_profile_power(ble_state["elapsed"])
            power = _sim_controls["manual_power"] if _sim_controls["manual_power"] is not None else base_power
            cadence = _sim_controls["manual_cadence"] if _sim_controls["manual_cadence"] is not None else SIM_DEFAULT_CADENCE

            ble_state["power"] = int(round(power))
            ble_state["cadence"] = float(cadence)
            ble_state["elapsed"] += dt

            if _sim_controls["manual_distance"] is not None:
                ble_state["distance"] = float(_sim_controls["manual_distance"])
            else:
                strokes_per_sec = ble_state["cadence"] / 60.0
                ble_state["distance"] += strokes_per_sec * DISTANCE_PER_STROKE * dt

            if _sim_controls["manual_energy"] is not None:
                ble_state["energy_kwh"] = float(_sim_controls["manual_energy"])
            else:
                ble_state["energy_kwh"] += (ble_state["power"] * dt) / 3_600_000.0
        else:
            ble_state["power"] = 0
            ble_state["cadence"] = 0.0

        prev = now


async def ble_logger():
    """
    Real PM5 logger.
    """
    global _start_t, _stroke_intervals, _last_notify_t, _last_notified_power, _last_stroke_t

    retry_start = _now_mono()
    print(f"⏳ Initial boot delay {int(INITIAL_BOOT_DELAY)}s before starting BLE scan...")
    await asyncio.sleep(INITIAL_BOOT_DELAY)

    while True:
        try:
            print("🔍 Scanning for PM5...")
            devices = await BleakScanner.discover(timeout=SCAN_INTERVAL)
            pm5 = next((d for d in devices if d.name and ("PM5" in d.name or "Concept2" in d.name)), None)

            if not pm5:
                if _now_mono() - retry_start > RETRY_TIMEOUT:
                    print("❌ Timed out waiting for PM5 to advertise. Resetting retry timer.")
                    retry_start = _now_mono()
                print("⏳ PM5 not found. Retrying in 5s...")
                await asyncio.sleep(5)
                continue

            print(f"✅ Found PM5: {pm5.name} [{pm5.address}]")
            async with BleakClient(pm5.address) as client:
                await client.start_notify(UUID_0036, notification_handler)
                print("🔗 Connected to PM5 BLE")
                ble_state["connected"] = True

                try:
                    await client.write_gatt_char(UUID_WRITE, build_sleep_command())
                    print("🛌 PM5 sleep timeout extended.")
                except Exception as e:
                    print(f"⚠️ Sleep extension failed (non-fatal): {e}")

                _start_t = _now_mono()
                _stroke_intervals.clear()
                _last_stroke_t = None
                _last_notify_t = None
                _last_notified_power = 0

                reset_session_metrics()

                prev = _now_mono()

                while True:
                    await asyncio.sleep(TICK_SECONDS)

                    now = _now_mono()
                    dt = now - prev
                    if dt <= 0:
                        prev = now
                        continue

                    if _last_stroke_t is None or (now - _last_stroke_t) > CADENCE_IDLE_SEC:
                        ble_state["cadence"] = 0.0
                        _stroke_intervals.clear()

                    if _last_notify_t is None:
                        ble_state["power"] = 0
                    else:
                        age = now - _last_notify_t
                        if age <= POWER_HOLD_SEC:
                            ble_state["power"] = _last_notified_power
                        elif age < POWER_HOLD_SEC + POWER_DECAY_WINDOW:
                            t = age - POWER_HOLD_SEC
                            factor = max(0.0, 1.0 - (t / POWER_DECAY_WINDOW))
                            ble_state["power"] = int(round(_last_notified_power * factor))
                        else:
                            ble_state["power"] = 0

                    if ble_state["session_active"]:
                        ble_state["elapsed"] += dt

                        if ble_state["cadence"] > 0:
                            strokes_per_sec = ble_state["cadence"] / 60.0
                            ble_state["distance"] += strokes_per_sec * DISTANCE_PER_STROKE * dt

                        ble_state["energy_kwh"] += (ble_state["power"] * dt) / 3_600_000.0

                    prev = now

        except Exception as e:
            print(f"⚠️ BLE logger error: {e}\n{traceback.format_exc()}")
            ble_state["connected"] = False
            print("🔄 Restarting BLE loop in 5s...")
            await asyncio.sleep(5)