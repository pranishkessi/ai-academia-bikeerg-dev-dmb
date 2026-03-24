import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Reliable idle timer:
 * - Uses refs for onIdle/onActive so renders don't reschedule the timer.
 * - Avoids rescheduling unless timeoutMs / isPaused / target actually change.
 * - Lets you choose which DOM events count as "activity".
 */
export default function useIdleTimer({
    timeoutMs = 10 * 60 * 1000,           // ✅ 10 minutes (default)
  onIdle,
  onActive,
  isPaused = false,
  activityEvents = ["pointerdown", "keydown", "touchstart"], // ✅ kiosk-friendly
  target = typeof window !== "undefined" ? window : null,
  debug = false,
} = {}) {
  const [isIdle, setIsIdle] = useState(false);

  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);
  useEffect(() => { onActiveRef.current = onActive; }, [onActive]);

  const timerRef = useRef(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clear();
    if (isPaused || !target) return;
    if (debug) console.log("[IdleTimer] schedule", timeoutMs, "ms");
    timerRef.current = setTimeout(() => {
      if (debug) console.log("[IdleTimer] -> IDLE");
      setIsIdle(true);
      onIdleRef.current && onIdleRef.current();
    }, timeoutMs);
  }, [isPaused, timeoutMs, target, debug]);

  const reset = useCallback(() => {
    if (isIdle) {
      if (debug) console.log("[IdleTimer] reset from idle -> ACTIVE");
      setIsIdle(false);
      onActiveRef.current && onActiveRef.current();
    }
    startTimer();
  }, [isIdle, startTimer, debug]);

  useEffect(() => {
    if (!target) return;

    if (isPaused) {
      if (debug) console.log("[IdleTimer] paused");
      clear();
      return;
    }

    startTimer();

    const onAny = (e) => {
      if (debug) console.log("[IdleTimer] activity:", e.type);
      reset();
    };

    // Attach listeners once (list changes only if the array content changes)
    const evs = Array.from(activityEvents);
    evs.forEach((ev) => target.addEventListener(ev, onAny, { passive: true }));

    return () => {
      clear();
      evs.forEach((ev) => target.removeEventListener(ev, onAny));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimer, isPaused, target, debug, JSON.stringify(activityEvents)]);

  return { isIdle, reset };
}
