// src/hooks/useAvatarMessages.js
import { useState, useEffect, useRef } from "react";
import { UNLOCKS, ENERGY_BANDS, BAND_MESSAGES, countUnlocked } from "../constants/unlocks";

export function useAvatarMessages({ energy, elapsedTime, sessionActive, unlockedTasks }) {
  const [message, setMessage] = useState({
    text: "WILLKOMMEN! Wenn Sie bereit sind, in die Pedale zu treten, drücken Sie zum Starten die grüne Taste (START).",
    kind: "info",
  });

  // --- existing refs you already had ---
  const prevEnergyRef = useRef(0);
  const prevSessionActiveRef = useRef(sessionActive);
  const lastSessionEnergyRef = useRef(0);

  // --- additions for auto-revert to Welcome after session end ---
  const WELCOME_MSG =
    "WILLKOMMEN! Wenn Sie bereit sind, in die " +
    "Pedale zu treten, drücken Sie zum Starten die grüne Taste (START).";
  const SESSION_END_DISPLAY_MS = 10000; // 10s in message box
  const revertTimerRef = useRef(null);
  const clearRevertTimer = () => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
  };
  const showWelcomeMessage = () => {
    clearRevertTimer();
    setMessage({ text: WELCOME_MSG, kind: "info" });
  };

  // NEW refs for energy-based motivation
  const lastMotivEnergyRef = useRef(0);     // last energy when we showed a motiv msg
  const lastMotivAtSecRef   = useRef(0);    // last elapsedTime (sec) we showed one
  const bandIndexRef        = useRef(0);    // current band index
  const bandCursorRef       = useRef({ 0:0,1:0,2:0,3:0,4:0 }); // round-robin per band

  const MIN_SECONDS_BETWEEN_MSGS = 10;      // rate-limit (tune as needed)
  const MIN_DELTA_ENERGY = 0.0005;          // only show next msg after +0.0005 kWh gained (tune)

  // -------- SESSION START/STOP (keep your working version) --------
  useEffect(() => {
    const wasActive = prevSessionActiveRef.current;

    if (!wasActive && sessionActive) {
      clearRevertTimer();
      setMessage({ text: "Los geht’s! Du erzeugst jetzt Energie.", kind: "success" });
      // reset motiv throttles for the new session
      lastMotivEnergyRef.current = 0;
      lastMotivAtSecRef.current = 0;
      bandIndexRef.current = 0;
      bandCursorRef.current = { 0:0,1:0,2:0,3:0,4:0 };
    }

    if (sessionActive) {
      lastSessionEnergyRef.current = energy;
    }

    if (wasActive && !sessionActive) {
      const finalEnergy = lastSessionEnergyRef.current ?? energy ?? 0;
      const unlockedCount = countUnlocked(finalEnergy);
      const totalTasks = UNLOCKS.length;

      setMessage({
        text: `Session beendet. Energie: ${Number(finalEnergy).toFixed(4)} kWh • Aufgaben: ${unlockedCount} / ${totalTasks}`,
        kind: "info",
      });

      // Auto-revert to welcome after 10s
      clearRevertTimer();
      revertTimerRef.current = setTimeout(() => {
        setMessage({ text: WELCOME_MSG, kind: "info" });
        revertTimerRef.current = null;
      }, SESSION_END_DISPLAY_MS);
    }

    prevSessionActiveRef.current = sessionActive;
  }, [sessionActive, energy]);

  // -------- TASK UNLOCKS (keep your working version) --------
  useEffect(() => {
    const prevEnergy = prevEnergyRef.current;
    if (energy > prevEnergy) {
      const newlyUnlocked = (unlockedTasks || UNLOCKS).find(
        (task) => energy >= task.threshold && prevEnergy < task.threshold
      );
      if (newlyUnlocked) {
        setMessage({ text: `Freigeschaltet: ${newlyUnlocked.label} 🔓`, kind: "unlock" });
        // On unlock we DO NOT also push a motivation message at the same moment
        lastMotivEnergyRef.current = energy;
        lastMotivAtSecRef.current = elapsedTime || 0;
      }
    }
    prevEnergyRef.current = energy;
  }, [energy, unlockedTasks, elapsedTime]);

  // -------- ENERGY-BASED MOTIVATION / DID-YOU-KNOW --------
  useEffect(() => {
    if (!sessionActive) return;

    // Compute current band
    const bandIdx = ENERGY_BANDS.findIndex(b => energy >= b.min && energy < b.max);
    bandIndexRef.current = bandIdx === -1 ? ENERGY_BANDS.length - 1 : bandIdx;

    // Throttle by time
    const sinceSec = (elapsedTime || 0) - (lastMotivAtSecRef.current || 0);
    if (sinceSec < MIN_SECONDS_BETWEEN_MSGS) return;

    // Throttle by energy delta
    const dE = energy - (lastMotivEnergyRef.current || 0);
    if (dE < MIN_DELTA_ENERGY) return;

    // Pick next message from this band (round-robin)
    const pool = BAND_MESSAGES[bandIndexRef.current] || [];
    if (pool.length === 0) return;

    const nextIdx = bandCursorRef.current[bandIndexRef.current] % pool.length;
    const nextText = pool[nextIdx];

    setMessage({ text: nextText, kind: "info" });

    // advance pointers
    bandCursorRef.current[bandIndexRef.current] = nextIdx + 1;
    lastMotivEnergyRef.current = energy;
    lastMotivAtSecRef.current = elapsedTime || 0;
  }, [energy, elapsedTime, sessionActive]);

  // Cleanup on unmount
  useEffect(() => () => clearRevertTimer(), []);

  return { message, setMessage };
}
