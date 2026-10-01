import { describe, expect, it, beforeEach } from 'vitest';
import {
  basketBounds,
  basketRect,
  catchLineY,
  clamp,
  comboBonus,
  createState,
  difficultyProgress,
  eggRect,
  getDifficulty,
  rectsOverlap,
  resetEggIds,
  stepGame,
  updateBasket,
} from './engine';
import { BASKET, DIFFICULTY, RULES, SCORING, WORLD } from './config';

/** Runs the simulation for `seconds` in fixed 60fps steps. */
const run = (state, seconds, move = 0) => {
  const dt = 1 / 60;
  const frames = Math.round(seconds / dt);
  const totals = { caught: 0, missed: 0 };
  for (let i = 0; i < frames; i += 1) {
    const events = stepGame(state, dt, { move });
    totals.caught += events.caught;
    totals.missed += events.missed;
  }
  return totals;
};

beforeEach(() => {
  resetEggIds();
});

describe('helpers', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });

  it('detects rectangle overlap and respects padding', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 20, y: 0, width: 10, height: 10 })).toBe(false);
    // 3px short of touching, but padding forgives it.
    expect(rectsOverlap(a, { x: 13, y: 0, width: 10, height: 10 }, 4)).toBe(true);
  });
});

describe('difficulty curve', () => {
  it('starts easy and ramps to the configured maximum', () => {
    const start = getDifficulty(0);
    const end = getDifficulty(DIFFICULTY.RAMP_SECONDS);
    expect(start.spawnInterval).toBeCloseTo(DIFFICULTY.START_INTERVAL);
    expect(end.spawnInterval).toBeCloseTo(DIFFICULTY.MIN_INTERVAL);
    expect(end.speedScale).toBeCloseTo(DIFFICULTY.MAX_SPEED_SCALE);
    expect(end.doubleChance).toBeCloseTo(DIFFICULTY.MAX_DOUBLE_CHANCE);
  });

  it('never exceeds the maximum and is monotonically harder', () => {
    const late = getDifficulty(DIFFICULTY.RAMP_SECONDS * 5);
    expect(late.progress).toBe(1);
    expect(late.spawnInterval).toBeCloseTo(DIFFICULTY.MIN_INTERVAL);
    expect(late.speedScale).toBeCloseTo(DIFFICULTY.MAX_SPEED_SCALE);

    let previousInterval = Infinity;
    for (let t = 0; t <= DIFFICULTY.RAMP_SECONDS; t += 5) {
      const { spawnInterval } = getDifficulty(t);
      // Allow a hair of floating-point slack on the lower bound.
      expect(spawnInterval).toBeLessThanOrEqual(previousInterval + 1e-9);
      expect(spawnInterval).toBeGreaterThanOrEqual(DIFFICULTY.MIN_INTERVAL - 1e-9);
      previousInterval = spawnInterval;
    }
  });

  it('reports progress clamped to 0..1', () => {
    expect(difficultyProgress(0)).toBe(0);
    expect(difficultyProgress(-10)).toBe(0);
    expect(difficultyProgress(DIFFICULTY.RAMP_SECONDS / 2)).toBeCloseTo(0.5);
    expect(difficultyProgress(1e6)).toBe(1);
  });
});

describe('scoring', () => {
  it('gives no bonus for the first catch and caps the streak bonus', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(SCORING.COMBO_STEP);
    expect(comboBonus(1000)).toBe(SCORING.COMBO_MAX_BONUS);
  });

  it('awards points and grows the combo when an egg is caught', () => {
    const state = createState();
    // Drop an egg straight onto a stationary basket.
    state.eggs.push({
      id: 1,
      x: state.basket.x,
      y: catchLineY() - 5,
      vx: 0,
      vy: 300,
      isGolden: false,
      rotation: 0,
      spin: 0,
      wobble: 0,
    });

    const events = stepGame(state, 1 / 60, { move: 0 });

    expect(events.caught).toBe(1);
    expect(state.caught).toBe(1);
    expect(state.combo).toBe(1);
    expect(state.score).toBe(SCORING.EGG);
    expect(state.lives).toBe(RULES.LIVES);
    // The egg must be removed from the world.
    expect(state.eggs).toHaveLength(0);
    // A score popup + sparkles were queued.
    expect(state.effects.some((e) => e.type === 'score')).toBe(true);
  });

  it('awards more for a golden egg and stacks the combo bonus', () => {
    const state = createState();
    state.combo = 4; // next catch is the 5th -> bonus applies
    state.eggs.push({
      id: 1,
      x: state.basket.x,
      y: catchLineY() - 5,
      vx: 0,
      vy: 300,
      isGolden: true,
      rotation: 0,
      spin: 0,
      wobble: 0,
    });

    stepGame(state, 1 / 60, { move: 0 });

    expect(state.score).toBe(SCORING.GOLDEN_EGG + comboBonus(5));
  });
});

describe('missing eggs', () => {
  it('costs a life, resets the combo and reports the miss', () => {
    const state = createState();
    state.combo = 7;
    // An egg already past the bottom of the world.
    state.eggs.push({
      id: 1,
      x: 50,
      y: WORLD.HEIGHT + 200,
      vx: 0,
      vy: 400,
      isGolden: false,
      rotation: 0,
      spin: 0,
      wobble: 0,
    });

    const events = stepGame(state, 1 / 60, { move: 0 });

    expect(events.missed).toBe(1);
    expect(state.lives).toBe(RULES.LIVES - 1);
    expect(state.combo).toBe(0);
    expect(state.missed).toBe(1);
    expect(state.eggs).toHaveLength(0);
    expect(state.effects.some((e) => e.type === 'splat')).toBe(true);
  });

  it('ends the game once every life is gone', () => {
    const state = createState();
    state.lives = 1;
    state.eggs.push({
      id: 1,
      x: 50,
      y: WORLD.HEIGHT + 200,
      vx: 0,
      vy: 400,
      isGolden: false,
      rotation: 0,
      spin: 0,
      wobble: 0,
    });

    stepGame(state, 1 / 60, { move: 0 });

    expect(state.lives).toBe(0);
    expect(state.status).toBe('over');
  });

  it('does not simulate once the game is over', () => {
    const state = createState();
    state.status = 'over';
    const before = state.elapsed;
    stepGame(state, 1 / 60, { move: 1 });
    expect(state.elapsed).toBe(before);
    expect(state.eggs).toHaveLength(0);
  });
});

describe('basket movement', () => {
  it('never leaves the playfield', () => {
    const { min, max } = basketBounds();

    const left = { x: WORLD.WIDTH / 2, vx: 0, pointerTargetX: null, squash: 0 };
    for (let i = 0; i < 300; i += 1) updateBasket(left, 1 / 60, -1);
    expect(left.x).toBeGreaterThanOrEqual(min);
    expect(left.x).toBeCloseTo(min);

    const right = { x: WORLD.WIDTH / 2, vx: 0, pointerTargetX: null, squash: 0 };
    for (let i = 0; i < 300; i += 1) updateBasket(right, 1 / 60, 1);
    expect(right.x).toBeLessThanOrEqual(max);
    expect(right.x).toBeCloseTo(max);
  });

  it('moves toward a pointer target and clamps it', () => {
    const basket = { x: WORLD.WIDTH / 2, vx: 0, pointerTargetX: 10, squash: 0 };
    for (let i = 0; i < 120; i += 1) updateBasket(basket, 1 / 60, 0);
    expect(basket.x).toBeCloseTo(BASKET.WIDTH / 2, 0);
  });

  it('lets the keyboard take over from a stale drag target', () => {
    const basket = { x: WORLD.WIDTH / 2, vx: 0, pointerTargetX: WORLD.WIDTH - 20, squash: 0 };
    // A drag target alone would pull the basket right; pressing left must win.
    updateBasket(basket, 1 / 60, -1);
    expect(basket.pointerTargetX).toBeNull();
    const afterOneFrame = basket.x;
    for (let i = 0; i < 30; i += 1) updateBasket(basket, 1 / 60, -1);
    expect(basket.x).toBeLessThan(afterOneFrame);
  });

  it('comes to rest when the player lets go', () => {
    const basket = { x: WORLD.WIDTH / 2, vx: 0, pointerTargetX: null, squash: 0 };
    for (let i = 0; i < 30; i += 1) updateBasket(basket, 1 / 60, 1);
    expect(Math.abs(basket.vx)).toBeGreaterThan(0);
    for (let i = 0; i < 200; i += 1) updateBasket(basket, 1 / 60, 0);
    expect(basket.vx).toBe(0);
  });
});

describe('simulation integrity', () => {
  it('keeps every egg inside the playfield and eventually removes all of them', () => {
    const state = createState();
    run(state, 20);

    for (const egg of state.eggs) {
      const rect = eggRect(egg);
      expect(rect.x).toBeGreaterThanOrEqual(-1);
      expect(rect.x + rect.width).toBeLessThanOrEqual(WORLD.WIDTH + 1);
      expect(state.eggs.length).toBeLessThan(40);
    }
    // Nothing should accumulate unboundedly.
    expect(state.effects.length).toBeLessThan(120);
  });

  it('keeps the basket rectangle aligned with its world position', () => {
    const state = createState();
    state.basket.x = 400;
    const rect = basketRect(state.basket);
    expect(rect.x).toBe(400 - BASKET.WIDTH / 2);
    expect(rect.y + rect.height).toBeCloseTo(catchLineY() + BASKET.HEIGHT);
  });

  it('spawns eggs over time and turns the chicken around at the walls', () => {
    const state = createState();
    run(state, 6);
    expect(state.elapsed).toBeGreaterThan(5.9);
    // The chicken must remain inside the field across a long patrol.
    let minX = Infinity;
    let maxX = -Infinity;
    const probe = createState();
    for (let i = 0; i < 60 * 60; i += 1) {
      stepGame(probe, 1 / 60, { move: 0 });
      minX = Math.min(minX, probe.chicken.x);
      maxX = Math.max(maxX, probe.chicken.x);
    }
    expect(minX).toBeGreaterThan(0);
    expect(maxX).toBeLessThan(WORLD.WIDTH);
  });

  it('is deterministic enough to always spawn at least one egg early on', () => {
    const state = createState();
    run(state, 2);
    // After 2 seconds with a 1.15s start interval, eggs must have appeared
    // (possibly already caught/missed, so check the cumulative counters).
    expect(state.caught + state.missed + state.eggs.length).toBeGreaterThan(0);
  });
});
