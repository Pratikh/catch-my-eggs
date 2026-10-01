/**
 * Tiny WebAudio sound engine.
 *
 * Every sound is synthesised at runtime with oscillators, so the game ships
 * zero audio files — nothing copyrighted, nothing to download, no broken
 * asset paths on GitHub Pages.
 *
 * Browsers block audio until the user interacts with the page, so the
 * AudioContext is created lazily inside `unlock()`, which callers invoke from
 * a real user gesture.
 */

const MASTER_VOLUME = 0.28;

let ctx = null;
let masterGain = null;
let muted = false;

const isSupported = () =>
  typeof window !== 'undefined' &&
  (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');

/** Creates (or resumes) the AudioContext. Must be called from a user gesture. */
export const unlock = () => {
  if (!isSupported()) return false;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return true;
  } catch {
    // Audio is a nice-to-have; never let it break the game.
    ctx = null;
    masterGain = null;
    return false;
  }
};

export const setMuted = (nextMuted) => {
  muted = nextMuted;
  if (masterGain && ctx) {
    // Short ramp avoids an audible click when toggling.
    masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.01);
  }
};

export const isMuted = () => muted;

/**
 * Plays one enveloped oscillator note.
 * Silently does nothing if audio is unavailable or still locked.
 */
const playTone = ({ freq, duration, type = 'sine', gain = 1, delay = 0, sweepTo = null }) => {
  if (!ctx || !masterGain || muted) return;
  try {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), start + duration);
    }

    // Quick attack, exponential decay — reads as a soft "blip".
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    /* ignore — audio must never throw into the game loop */
  }
};

export const sfx = {
  /** Cheerful rising two-note blip. */
  catch: () => {
    playTone({ freq: 660, duration: 0.12, type: 'triangle', gain: 0.5 });
    playTone({ freq: 990, duration: 0.16, type: 'triangle', gain: 0.35, delay: 0.06 });
  },
  /** Richer chime for the golden egg. */
  catchGolden: () => {
    playTone({ freq: 880, duration: 0.14, type: 'triangle', gain: 0.45 });
    playTone({ freq: 1320, duration: 0.16, type: 'triangle', gain: 0.35, delay: 0.07 });
    playTone({ freq: 1760, duration: 0.22, type: 'sine', gain: 0.28, delay: 0.14 });
  },
  /** Descending "aww" for a dropped egg. */
  miss: () => {
    playTone({ freq: 300, duration: 0.28, type: 'sawtooth', gain: 0.3, sweepTo: 110 });
  },
  /** Smooth UI click. */
  click: () => {
    playTone({ freq: 520, duration: 0.08, type: 'square', gain: 0.22 });
  },
  /** Rising fanfare when a new best score is reached. */
  highScore: () => {
    [660, 830, 990, 1320].forEach((freq, i) => {
      playTone({ freq, duration: 0.18, type: 'triangle', gain: 0.3, delay: i * 0.09 });
    });
  },
  /** Gentle game-over motif. */
  gameOver: () => {
    [520, 440, 350, 260].forEach((freq, i) => {
      playTone({ freq, duration: 0.32, type: 'triangle', gain: 0.34, delay: i * 0.16 });
    });
  },
  start: () => {
    [520, 660, 880].forEach((freq, i) => {
      playTone({ freq, duration: 0.16, type: 'triangle', gain: 0.3, delay: i * 0.08 });
    });
  },
};
