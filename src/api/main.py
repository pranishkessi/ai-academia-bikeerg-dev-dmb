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

# Stage 1 sync improvement:
# keep one backend task structure instead of parallel arrays
AI_TASKS = [
    {
        "id": "level1",
        "shortLabel": "Computer eingeschaltet",
        "label": "Du hast den Computer eingeschaltet",
        "threshold": 0.0017,
    },
    {
        "id": "level2",
        "shortLabel": "10 Google-Suchanfragen",
        "label": "Du hast 10 Suchanfragen bei Google geschafft",
        "threshold": 0.003,
    },
    {
        "id": "level3",
        "shortLabel": "1.000 Zeichen übersetzt",
        "label": "Du hast 1.000 Zeichen Text mit KI übersetzt",
        "threshold": 0.0045,
    },
    {
        "id": "level4",
        "shortLabel": "2 ChatGPT-Fragen",
        "label": "Du hast 2 Fragen an ChatGPT geschafft",
        "threshold": 0.006,
    },
    {
        "id": "level5",
        "shortLabel": "Bild mit KI erstellt",
        "label": "Du hast ein Bild mit KI erstellt",
        "threshold": 0.01,
    },
    {
        "id": "level6",
        "shortLabel": "5 Sekunden KI-Video",
        "label": "Streng Dich an, in einer Stunde hast Du 5 Sekunden Video mit KI erstellt wenn Du konstant mit 100 Watt trittst",
        "threshold": 0.5,
    },
]


def log_session_to_file(snapshot):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = os.path.join(LOG_DIR, f"session_{timestamp}.json")
    with open(filename, "w") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    print(f"📄 Session saved to {filename}")


def get_energy_values():
    raw_energy = float(ble_state.get("energy_kwh", 0.0))
    return raw_energy, round(raw_energy, 4)


def get_unlocked_tasks(raw_energy: float):
    return [task for task in AI_TASKS if raw_energy >= task["threshold"]]


def get_current_level(raw_energy: float):
    unlocked = get_unlocked_tasks(raw_energy)
    return len(unlocked)


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
    session_active = ble_state.get("session_active", False)
    raw_energy, display_energy = get_energy_values()

    if not session_active:
        raw_energy = 0.0
        display_energy = 0.0

    unlocked_tasks = get_unlocked_tasks(raw_energy)
    current_level = len(unlocked_tasks)

    return {
        "power_watts": ble_state.get("power", 0) if session_active else 0,
        "stroke_rate": int(ble_state.get("cadence", 0)) if session_active else 0,
        "distance_meters": int(ble_state.get("distance", 0)) if session_active else 0,
        "elapsed_time": int(ble_state.get("elapsed", 0)) if session_active else 0,
        # raw value for logic
        "energy_kwh": raw_energy,
        # rounded value for display/debug convenience
        "energy_kwh_display": display_energy,
        "session_active": session_active,
        "connected": ble_state.get("connected", False),
        "last_session_snapshot": last_session_snapshot,
        "sim_mode": SIM_MODE,
        # Stage 1 backend sync/debug metadata
        "unlocked_count": current_level,
        "current_level": current_level,
        "ai_tasks": AI_TASKS,
    }


@app.post("/start")
async def start_session():
    reset_session_metrics()
    ble_state["session_active"] = True
    return {"message": "Session started.", "sim_mode": SIM_MODE}


@app.post("/stop")
async def stop_session():
    raw_energy, display_energy = get_energy_values()
    unlocked_tasks = get_unlocked_tasks(raw_energy)

    last_session_snapshot.clear()
    last_session_snapshot.update({
        "elapsed_time": int(ble_state.get("elapsed", 0)),
        "distance_meters": int(ble_state.get("distance", 0)),
        "energy_kwh": raw_energy,
        "energy_kwh_display": display_energy,
        "tasks_unlocked": [task["shortLabel"] for task in unlocked_tasks],
        "tasks_unlocked_details": [
            {
                "id": task["id"],
                "shortLabel": task["shortLabel"],
                "label": task["label"],
                "threshold": task["threshold"],
            }
            for task in unlocked_tasks
        ],
        "unlocked_count": len(unlocked_tasks),
        "current_level": len(unlocked_tasks),
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
    raw_energy, display_energy = get_energy_values()

    return {
        "sim_mode": SIM_MODE,
        "session_active": ble_state.get("session_active", False),
        "ble_state": ble_state,
        "energy_kwh": raw_energy,
        "energy_kwh_display": display_energy,
        "unlocked_count": len(get_unlocked_tasks(raw_energy)),
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
    return {
        "message": "Simulated energy updated.",
        "energy_kwh": ble_state["energy_kwh"],
        "unlocked_count": len(get_unlocked_tasks(float(value))),
    }


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