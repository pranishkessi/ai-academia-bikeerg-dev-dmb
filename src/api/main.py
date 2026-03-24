# src/api/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
from datetime import datetime

from src.api.ble_runner import (
    ble_logger,
    simulated_logger,
    ble_state,
    reset_session_metrics,
    reset_test_state,
    set_simulated_power,
    set_simulated_cadence,
    set_simulated_energy,
    set_simulated_distance,
    set_simulation_profile,
    get_simulation_status,
)

app = FastAPI()
last_session_snapshot = {}

LOG_DIR = "session_logs"
os.makedirs(LOG_DIR, exist_ok=True)

SIM_MODE = os.getenv("SIM_MODE", "0") == "1"

# Updated 6-task model for logs / snapshots
THRESHOLDS = [0.0017, 0.003, 0.0045, 0.006, 0.01, 0.5]
TASK_LABELS = [
    "Computer eingeschaltet",
    "10 Google-Suchanfragen",
    "1.000 Zeichen übersetzt",
    "2 ChatGPT-Fragen",
    "Bild mit KI erstellt",
    "5 Sekunden KI-Video",
]


def log_session_to_file(snapshot):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = os.path.join(LOG_DIR, f"session_{timestamp}.json")
    with open(filename, "w") as f:
        json.dump(snapshot, f, indent=2)
    print(f"📄 Session saved to {filename}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    if SIM_MODE:
        print("🧪 Starting backend in SIM_MODE=1")
        asyncio.create_task(simulated_logger())
    else:
        print("🚴 Starting backend in real BLE mode")
        asyncio.create_task(ble_logger())


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Concept2 BikeErg Real-Time API",
        "sim_mode": SIM_MODE,
    }


@app.get("/data")
def get_data():
    return {
        "power_watts": ble_state.get("power", 0) if ble_state.get("session_active") else 0,
        "stroke_rate": int(ble_state.get("cadence", 0)) if ble_state.get("session_active") else 0,
        "distance_meters": int(ble_state.get("distance", 0)) if ble_state.get("session_active") else 0,
        "elapsed_time": int(ble_state.get("elapsed", 0)) if ble_state.get("session_active") else 0,
        "energy_kwh": round(ble_state.get("energy_kwh", 0.0), 4) if ble_state.get("session_active") else 0.0,
        "session_active": ble_state.get("session_active", False),
        "connected": ble_state.get("connected", False),
        "last_session_snapshot": last_session_snapshot,
        "sim_mode": SIM_MODE,
    }


@app.post("/start")
async def start_session():
    reset_session_metrics()
    ble_state["session_active"] = True
    return {"message": "Session started.", "sim_mode": SIM_MODE}


@app.post("/stop")
async def stop_session():
    energy = ble_state.get("energy_kwh", 0.0)
    unlocked_tasks = [label for t, label in zip(THRESHOLDS, TASK_LABELS) if energy >= t]

    last_session_snapshot.clear()
    last_session_snapshot.update({
        "elapsed_time": int(ble_state.get("elapsed", 0)),
        "distance_meters": int(ble_state.get("distance", 0)),
        "energy_kwh": round(energy, 4),
        "tasks_unlocked": unlocked_tasks,
        "sim_mode": SIM_MODE,
        "stopped_at": datetime.now().isoformat(),
    })

    log_session_to_file(last_session_snapshot)

    ble_state["session_active"] = False
    asyncio.create_task(reset_after_delay())
    return {"message": "Session stopped.", "snapshot": last_session_snapshot}


async def reset_after_delay():
    await asyncio.sleep(30)
    reset_session_metrics()
    last_session_snapshot.clear()


# =========================
# Dev-only simulation endpoints
# Active only when SIM_MODE=1
# =========================

def ensure_sim_mode():
    if not SIM_MODE:
        raise HTTPException(status_code=403, detail="Simulation endpoints are disabled in production mode.")


@app.get("/test/status")
def test_status():
    ensure_sim_mode()
    return {
        "sim_mode": SIM_MODE,
        "session_active": ble_state.get("session_active", False),
        "ble_state": ble_state,
        "simulation": get_simulation_status(),
    }


@app.post("/test/reset")
async def test_reset():
    ensure_sim_mode()
    ble_state["session_active"] = False
    reset_session_metrics()
    reset_test_state()
    last_session_snapshot.clear()
    return {"message": "Simulation/test state reset."}


@app.post("/test/set-energy")
async def test_set_energy(value: float = Query(..., description="Energy in kWh")):
    ensure_sim_mode()
    set_simulated_energy(value)
    ble_state["energy_kwh"] = float(value)
    return {"message": "Simulated energy updated.", "energy_kwh": ble_state["energy_kwh"]}


@app.post("/test/set-power")
async def test_set_power(value: float = Query(..., description="Power in watts")):
    ensure_sim_mode()
    set_simulated_power(value)
    ble_state["power"] = int(round(value))
    return {"message": "Simulated power updated.", "power": ble_state["power"]}


@app.post("/test/set-cadence")
async def test_set_cadence(value: float = Query(..., description="Cadence/SPM")):
    ensure_sim_mode()
    set_simulated_cadence(value)
    ble_state["cadence"] = float(value)
    return {"message": "Simulated cadence updated.", "cadence": ble_state["cadence"]}


@app.post("/test/set-distance")
async def test_set_distance(value: float = Query(..., description="Distance in meters")):
    ensure_sim_mode()
    set_simulated_distance(value)
    ble_state["distance"] = float(value)
    return {"message": "Simulated distance updated.", "distance": ble_state["distance"]}


@app.post("/test/profile")
async def test_set_profile(name: str = Query(..., description="constant or ramp")):
    ensure_sim_mode()
    set_simulation_profile(name)
    return {"message": "Simulation profile updated.", "profile": name}


@app.post("/test/clear-manual-energy")
async def test_clear_manual_energy():
    ensure_sim_mode()
    set_simulated_energy(None)
    return {"message": "Manual energy override cleared."}


@app.post("/test/clear-manual-power")
async def test_clear_manual_power():
    ensure_sim_mode()
    set_simulated_power(None)
    return {"message": "Manual power override cleared."}