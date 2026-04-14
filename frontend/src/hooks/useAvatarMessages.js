// src/hooks/useAvatarMessages.js
import { useState, useEffect, useRef } from "react";
import {
  UNLOCKS,
  ENERGY_BANDS,
  BAND_MESSAGES,
  getShuffledBandMessages,
} from "../constants/unlocks";

export function useAvatarMessages({ energy, elapsedTime, sessionActive, unlockedTasks }) {
  const [message, setMessage] = useState({
    text: "WILLKOMMEN! Wenn Sie bereit sind, in die Pedale zu treten, drücken Sie zum Starten die grüne Taste (START).",
    kind: "info",
  });

  const prevEnergyRef = useRef(0);
  const prevSessionActiveRef = useRef(sessionActive);
  const lastSessionEnergyRef = useRef(0);

  const WELCOME_MSG =
    "WILLKOMMEN! Wenn Sie bereit sind, in die " +
    "Pedale zu treten, drücken Sie zum Starten die grüne Taste (START).";
  const SESSION_END_DISPLAY_MS = 10000;

  const revertTimerRef = useRef(null);
  const clearRevertTimer = () => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
  };

  const lastMotivEnergyRef = useRef(0);
  const lastMotivAtSecRef = useRef(0);
  const bandIndexRef = useRef(0);
  const bandCursorRef = useRef({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });

  // New: shuffled per-session message order
  const shuffledBandMessagesRef = useRef(getShuffledBandMessages());

  const MIN_SECONDS_BETWEEN_MSGS = 10;
  const MIN_DELTA_ENERGY = 0.0005;

  // Use active tasks from DashboardLayout if available, otherwise fall back
  const activeTasks =
    Array.isArray(unlockedTasks) && unlockedTasks.length > 0 ? unlockedTasks : UNLOCKS;

  const countUnlockedFromTasks = (value) =>
    activeTasks.filter((task) => Number(value) >= Number(task.threshold)).length;

  // -------- SESSION START/STOP --------
  useEffect(() => {
    const wasActive = prevSessionActiveRef.current;

    if (!wasActive && sessionActive) {
      clearRevertTimer();
      setMessage({ text: "Los geht’s! Du erzeugst jetzt Energie.", kind: "success" });

      // Reset motivation state for a new session
      lastMotivEnergyRef.current = 0;
      lastMotivAtSecRef.current = 0;
      bandIndexRef.current = 0;
      bandCursorRef.current = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

      // Shuffle messages once per new session
      shuffledBandMessagesRef.current = getShuffledBandMessages();
    }

    if (sessionActive) {
      lastSessionEnergyRef.current = energy;
    }

    if (wasActive && !sessionActive) {
      const finalEnergy = lastSessionEnergyRef.current ?? energy ?? 0;
      const unlockedCount = countUnlockedFromTasks(finalEnergy);
      const totalTasks = activeTasks.length;

      setMessage({
        text: `Session beendet. Energie: ${Number(finalEnergy).toFixed(4)} kWh • Aufgaben: ${unlockedCount} / ${totalTasks}`,
        kind: "info",
      });

      clearRevertTimer();
      revertTimerRef.current = setTimeout(() => {
        setMessage({ text: WELCOME_MSG, kind: "info" });
        revertTimerRef.current = null;
      }, SESSION_END_DISPLAY_MS);
    }

    prevSessionActiveRef.current = sessionActive;
  }, [sessionActive, energy, activeTasks]);

  // -------- TASK UNLOCKS --------
  useEffect(() => {
    const prevEnergy = prevEnergyRef.current;

    if (energy > prevEnergy) {
      const newlyUnlocked = activeTasks.find(
        (task) => energy >= task.threshold && prevEnergy < task.threshold
      );

      if (newlyUnlocked) {
        setMessage({ text: `Freigeschaltet: ${newlyUnlocked.label} 🔓`, kind: "unlock" });

        // Avoid immediate motivational message right after unlock
        lastMotivEnergyRef.current = energy;
        lastMotivAtSecRef.current = elapsedTime || 0;
      }
    }

    prevEnergyRef.current = energy;
  }, [energy, activeTasks, elapsedTime]);

  // -------- ENERGY-BASED MOTIVATION / DID-YOU-KNOW --------
  useEffect(() => {
    if (!sessionActive) return;

    const bandIdx = ENERGY_BANDS.findIndex((b) => energy >= b.min && energy < b.max);
    bandIndexRef.current = bandIdx === -1 ? ENERGY_BANDS.length - 1 : bandIdx;

    // Throttle by time
    const sinceSec = (elapsedTime || 0) - (lastMotivAtSecRef.current || 0);
    if (sinceSec < MIN_SECONDS_BETWEEN_MSGS) return;

    // Throttle by energy increase
    const dE = energy - (lastMotivEnergyRef.current || 0);
    if (dE < MIN_DELTA_ENERGY) return;

    // Use shuffled order for this session
    const pool =
      shuffledBandMessagesRef.current[bandIndexRef.current] ||
      BAND_MESSAGES[bandIndexRef.current] ||
      [];

    if (pool.length === 0) return;

    const nextIdx = bandCursorRef.current[bandIndexRef.current] % pool.length;
    const nextText = pool[nextIdx];

    setMessage({ text: nextText, kind: "info" });

    bandCursorRef.current[bandIndexRef.current] = nextIdx + 1;
    lastMotivEnergyRef.current = energy;
    lastMotivAtSecRef.current = elapsedTime || 0;
  }, [energy, elapsedTime, sessionActive]);

  // Cleanup on unmount
  useEffect(() => () => clearRevertTimer(), []);

  return { message, setMessage };
}