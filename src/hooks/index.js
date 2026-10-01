import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../game/config';

/**
 * localStorage-backed state that degrades gracefully when storage is
 * unavailable (private mode, disabled cookies, SSR).
 */
export const usePersistentState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      // Guard against a wrong-typed value surviving from an older version.
      return typeof parsed === typeof initialValue ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — not worth breaking the game over */
    }
  }, [key, value]);

  return [value, setValue];
};

export const useHighScore = () => usePersistentState(STORAGE_KEYS.HIGH_SCORE, 0);
export const useMuted = () => usePersistentState(STORAGE_KEYS.MUTED, false);

/** Tracks a CSS media query, safely guarded for environments without matchMedia. */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(list.matches);
    // addListener is the Safari < 14 fallback.
    if (list.addEventListener) {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
};

/**
 * Measures an element's content box and keeps it up to date.
 * Used to scale the fixed-size game world to the available pixels.
 */
export const useElementSize = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setSize((prev) =>
      Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
        ? prev
        : { width: rect.width, height: rect.height },
    );
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return [ref, size];
};
