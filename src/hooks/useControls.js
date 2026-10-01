import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Central input handling for the game.
 *
 * Returns a ref holding the current movement intent (-1 / 0 / 1) plus the
 * handlers the on-screen buttons and the playfield need. Deliberately keeps
 * the movement value in a ref rather than state: it is read by the animation
 * loop every frame and must never trigger a React re-render.
 */
export const useControls = ({ enabled = true, onPauseToggle, onAnyInput } = {}) => {
  const moveRef = useRef(0);
  // Which keys are currently held, so releasing one of two doesn't stop motion.
  const keysRef = useRef(new Set());
  const [buttonState, setButtonState] = useState({ left: false, right: false });

  const notify = useCallback(() => {
    if (onAnyInput) onAnyInput();
  }, [onAnyInput]);

  const recompute = useCallback(() => {
    const keys = keysRef.current;
    const left = keys.has('left') || buttonState.left;
    const right = keys.has('right') || buttonState.right;
    moveRef.current = (right ? 1 : 0) - (left ? 1 : 0);
  }, [buttonState.left, buttonState.right]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  // ---- On-screen button press handlers -------------------------------------
  const pressButton = useCallback(
    (direction) => {
      notify();
      setButtonState((prev) =>
        prev[direction] ? prev : { ...prev, [direction]: true },
      );
    },
    [notify],
  );

  const releaseButton = useCallback((direction) => {
    setButtonState((prev) => (prev[direction] ? { ...prev, [direction]: false } : prev));
  }, []);

  // ---- Keyboard ------------------------------------------------------------
  useEffect(() => {
    if (!enabled) {
      keysRef.current.clear();
      recompute();
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.repeat) return;
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysRef.current.add('left');
          notify();
          // Stop the page from scrolling with the arrow keys.
          event.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysRef.current.add('right');
          notify();
          event.preventDefault();
          break;
        case 'p':
        case 'P':
          if (onPauseToggle) onPauseToggle();
          break;
        default:
          break;
      }
      recompute();
    };

    const onKeyUp = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysRef.current.delete('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysRef.current.delete('right');
          break;
        default:
          break;
      }
      recompute();
    };

    // Releasing everything on blur prevents a "stuck key" after tab switching.
    const onBlur = () => {
      keysRef.current.clear();
      recompute();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    // Captured so the cleanup clears the same Set the handlers used.
    const heldKeys = keysRef.current;
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      heldKeys.clear();
    };
  }, [enabled, notify, onPauseToggle, recompute]);

  // Releasing a held on-screen button anywhere (even off the button) must stop
  // movement, otherwise the basket can drift away forever on mobile.
  useEffect(() => {
    if (!enabled) {
      setButtonState({ left: false, right: false });
      return undefined;
    }
    const releaseAll = () => {
      setButtonState((prev) =>
        prev.left || prev.right ? { left: false, right: false } : prev,
      );
    };
    window.addEventListener('pointerup', releaseAll);
    window.addEventListener('pointercancel', releaseAll);
    return () => {
      window.removeEventListener('pointerup', releaseAll);
      window.removeEventListener('pointercancel', releaseAll);
    };
  }, [enabled]);

  return {
    moveRef,
    buttonState,
    pressButton,
    releaseButton,
  };
};
