import { useEffect, useRef } from 'react';

/** Longest frame we will ever simulate, to avoid huge jumps after a stall. */
const MAX_DELTA = 1 / 20;

/**
 * Drives the game with a single requestAnimationFrame loop.
 *
 * The authoritative game state lives in a ref (mutated in place, never
 * re-created) so the simulation never tears. A throttled snapshot is published
 * to React state at ~30fps for the HUD, which keeps the screen text honest
 * without re-rendering on every one of the 60 frames.
 *
 * The loop is guaranteed to stop on game over, pause, unmount and restart.
 */
export const useGameLoop = ({ step, onFrame, running, snapshotIntervalMs = 32 }) => {
  const stepRef = useRef(step);
  const onFrameRef = useRef(onFrame);
  stepRef.current = step;
  onFrameRef.current = onFrame;

  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (!running) {
      // Hard stop: cancel any pending frame so nothing keeps simulating.
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      lastTimeRef.current = 0;
      return undefined;
    }

    const tick = (time) => {
      if (!runningRef.current) {
        rafRef.current = 0;
        return;
      }
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, MAX_DELTA);
      lastTimeRef.current = time;

      if (dt > 0) stepRef.current(dt);

      accumulatorRef.current += dt * 1000;
      if (accumulatorRef.current >= snapshotIntervalMs) {
        accumulatorRef.current = 0;
        if (onFrameRef.current) onFrameRef.current();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
    };
  }, [running, snapshotIntervalMs]);
};
