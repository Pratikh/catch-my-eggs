import { WORLD, CHICKEN, BASKET, EGG, DIFFICULTY, SCORING, RULES, EFFECTS } from './config';

/** Clamp `value` into the inclusive range [min, max]. */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Random float in [min, max). */
export const randRange = (min, max) => min + Math.random() * (max - min);

/** Random integer in [min, max]. */
export const randInt = (min, max) => Math.floor(randRange(min, max + 1));

/**
 * Moves `current` toward `target` by at most `maxDelta`.
 * Used for both keyboard acceleration and friction so the basket always
 * feels smooth and never overshoots.
 */
export const approach = (current, target, maxDelta) => {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
};

/**
 * Progress of the difficulty ramp, 0 (fresh game) → 1 (fully ramped).
 * Ramps linearly over DIFFICULTY.RAMP_SECONDS and then holds at 1.
 */
export const difficultyProgress = (elapsedSeconds) =>
  clamp(elapsedSeconds / DIFFICULTY.RAMP_SECONDS, 0, 1);

/**
 * Derives every difficulty-dependent number from elapsed play time.
 * Kept as one pure function so tests can assert the curve is monotonic
 * and never becomes impossible.
 */
export const getDifficulty = (elapsedSeconds) => {
  const t = difficultyProgress(elapsedSeconds);
  return {
    progress: t,
    spawnInterval: lerp(DIFFICULTY.START_INTERVAL, DIFFICULTY.MIN_INTERVAL, t),
    speedScale: lerp(DIFFICULTY.START_SPEED_SCALE, DIFFICULTY.MAX_SPEED_SCALE, t),
    doubleChance: lerp(DIFFICULTY.START_DOUBLE_CHANCE, DIFFICULTY.MAX_DOUBLE_CHANCE, t),
    goldenChance: lerp(DIFFICULTY.START_GOLDEN_CHANCE, DIFFICULTY.MAX_GOLDEN_CHANCE, t),
  };
};

/** Combo bonus awarded for the `combo`-th consecutive catch (1-based). */
export const comboBonus = (combo) => {
  if (combo <= 1) return 0;
  return Math.min((combo - 1) * SCORING.COMBO_STEP, SCORING.COMBO_MAX_BONUS);
};

let eggIdCounter = 0;

/** Resets the id sequence — used by tests for deterministic snapshots. */
export const resetEggIds = () => {
  eggIdCounter = 0;
};

/** Creates the mutable game state for a fresh session. */
export const createState = (highScore = 0) => ({
  status: 'running',
  elapsed: 0,
  score: 0,
  highScore,
  lives: RULES.LIVES,
  missed: 0,
  caught: 0,
  combo: 0,
  bestCombo: 0,
  /** Seconds until the next spawn attempt. */
  spawnTimer: 0.6,
  eggs: [],
  effects: [],
  /** Monotonic id, used to give every effect a stable React key. */
  nextEffectId: 1,
  shakeUntil: 0,
  chicken: {
    x: WORLD.WIDTH / 2,
    vx: CHICKEN.SPEED,
    bobPhase: 0,
    turnCooldown: 0,
    /** Face direction: 1 = right, -1 = left. */
    facing: 1,
  },
  basket: {
    x: WORLD.WIDTH / 2,
    vx: 0,
    /** Touch/drag target; null when the basket is keyboard-controlled. */
    pointerTargetX: null,
    squash: 0,
  },
});

/** Horizontal limits for the chicken so it never leaves the playfield. */
const chickenBounds = () => ({
  min: CHICKEN.MARGIN_X + CHICKEN.WIDTH / 2,
  max: WORLD.WIDTH - CHICKEN.MARGIN_X - CHICKEN.WIDTH / 2,
});

/** Horizontal limits for the basket. */
export const basketBounds = () => ({
  min: BASKET.WIDTH / 2,
  max: WORLD.WIDTH - BASKET.WIDTH / 2,
});

/** World-space rectangle the basket occupies (used for catching). */
export const basketRect = (basket) => ({
  x: basket.x - BASKET.WIDTH / 2,
  y: WORLD.HEIGHT - BASKET.BOTTOM_OFFSET - BASKET.HEIGHT,
  width: BASKET.WIDTH,
  height: BASKET.HEIGHT,
});

/** World-space rectangle an egg occupies. */
export const eggRect = (egg) => ({
  x: egg.x - EGG.WIDTH / 2,
  y: egg.y - EGG.HEIGHT / 2,
  width: EGG.WIDTH,
  height: EGG.HEIGHT,
});

/**
 * Axis-aligned bounding-box overlap, with a little forgiveness so near
 * misses that visually look caught still count (feels fairer on mobile).
 */
export const rectsOverlap = (a, b, padding = 0) =>
  a.x - padding < b.x + b.width &&
  a.x + a.width + padding > b.x &&
  a.y - padding < b.y + b.height &&
  a.y + a.height + padding > b.y;

/** Catch tolerance in world units. */
export const CATCH_PADDING = 10;

/**
 * The rim of the basket is what actually catches eggs: an egg is only
 * caught once it has fallen far enough to reach the rim line. This prevents
 * eggs "sticking" to the basket from above.
 */
export const catchLineY = () => WORLD.HEIGHT - BASKET.BOTTOM_OFFSET - BASKET.HEIGHT;

/** Advances the chicken's patrol + idle bob. */
export const updateChicken = (chicken, dt) => {
  chicken.bobPhase += dt * CHICKEN.BOB_SPEED;

  const { min, max } = chickenBounds();

  if (chicken.turnCooldown > 0) {
    chicken.turnCooldown -= dt;
  } else {
    chicken.x += chicken.vx * dt;
    if (chicken.x <= min) {
      chicken.x = min;
      chicken.vx = Math.abs(chicken.vx);
      chicken.turnCooldown = CHICKEN.TURN_PAUSE;
    } else if (chicken.x >= max) {
      chicken.x = max;
      chicken.vx = -Math.abs(chicken.vx);
      chicken.turnCooldown = CHICKEN.TURN_PAUSE;
    }
  }
  chicken.facing = chicken.vx >= 0 ? 1 : -1;
};

/** Advances the basket from keyboard input and/or a pointer target. */
export const updateBasket = (basket, dt, moveInput) => {
  const { min, max } = basketBounds();

  // Keyboard input always wins over a stale drag target, so switching from
  // touch to keys mid-game does not leave the basket following a finger.
  if (moveInput !== 0 && basket.pointerTargetX !== null) {
    basket.pointerTargetX = null;
  }

  if (basket.pointerTargetX !== null) {
    // Touch/drag: ease toward the finger for a smooth, non-jittery follow.
    const t = 1 - Math.exp(-BASKET.POINTER_LERP * dt);
    basket.x = lerp(basket.x, basket.pointerTargetX, t);
    basket.vx = 0;
  } else if (moveInput !== 0) {
    const target = moveInput * BASKET.SPEED;
    basket.vx = approach(basket.vx, target, BASKET.ACCELERATION * dt);
    basket.x += basket.vx * dt;
  } else {
    basket.vx = approach(basket.vx, 0, BASKET.FRICTION * dt);
    basket.x += basket.vx * dt;
  }

  basket.x = clamp(basket.x, min, max);
  basket.squash = Math.max(0, basket.squash - dt * 3.2);
};

/** Spawns one or two eggs above the chicken. */
const spawnEggs = (state, difficulty) => {
  const { chicken } = state;
  const isDouble = Math.random() < difficulty.doubleChance;
  const count = isDouble ? 2 : 1;

  const baseX = chicken.x + randRange(-EGG.SPAWN_JITTER, EGG.SPAWN_JITTER);
  const spawnY = CHICKEN.CENTER_Y + CHICKEN.HEIGHT * 0.38;

  for (let i = 0; i < count; i += 1) {
    // For a pair, offset the second egg so the two do not overlap.
    const offset = count === 2 ? (i === 0 ? -1 : 1) * (RULES.PAIR_SEPARATION / 2) : 0;
    const x = clamp(
      baseX + offset + randRange(-8, 8),
      EGG.WIDTH,
      WORLD.WIDTH - EGG.WIDTH,
    );
    const speed = randRange(EGG.MIN_SPEED, EGG.MAX_SPEED) * difficulty.speedScale;
    const isGolden = Math.random() < difficulty.goldenChance;

    eggIdCounter += 1;
    state.eggs.push({
      id: eggIdCounter,
      x,
      y: spawnY - i * 10,
      vx: randRange(-EGG.MAX_DRIFT, EGG.MAX_DRIFT),
      vy: speed,
      isGolden,
      /** Rotation angle in degrees, purely cosmetic. */
      rotation: randRange(-16, 16),
      spin: randRange(-40, 40),
      /** Wobble phase so eggs do not all look identical while falling. */
      wobble: randRange(0, Math.PI * 2),
    });
  }
};

/** Adds a transient visual effect with a unique key. */
const addEffect = (state, effect) => {
  state.nextEffectId += 1;
  state.effects.push({ id: state.nextEffectId, age: 0, ...effect });
};

/** Sparkle burst shown when an egg is caught. */
const addSparkles = (state, x, y, isGolden) => {
  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + randRange(-0.2, 0.2);
    addEffect(state, {
      type: 'sparkle',
      x,
      y,
      vx: Math.cos(angle) * randRange(60, 130),
      vy: Math.sin(angle) * randRange(60, 130) - 40,
      lifetime: EFFECTS.SPARKLE,
      isGolden,
    });
  }
};

/** Handles a caught egg: scoring, combo, effects. */
const onCatch = (state, egg) => {
  state.caught += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);

  const base = egg.isGolden ? SCORING.GOLDEN_EGG : SCORING.EGG;
  const bonus = comboBonus(state.combo);
  const gained = base + bonus;

  state.score += gained;
  state.basket.squash = 1;

  addEffect(state, {
    type: 'score',
    x: state.basket.x,
    y: catchLineY() - 10,
    value: gained,
    lifetime: EFFECTS.SCORE_POPUP,
    isGolden: egg.isGolden,
  });
  addSparkles(state, egg.x, egg.y, egg.isGolden);

  if (state.combo >= 3) {
    addEffect(state, {
      type: 'combo',
      x: WORLD.WIDTH / 2,
      y: 150,
      value: state.combo,
      lifetime: EFFECTS.COMBO_BANNER,
    });
  }
};

/** Handles a missed egg: life loss, combo reset, splat. */
const onMiss = (state, egg) => {
  state.missed += 1;
  state.lives -= 1;
  state.combo = 0;
  state.shakeUntil = state.elapsed + 0.4;

  addEffect(state, {
    type: 'splat',
    x: egg.x,
    y: WORLD.HEIGHT - BASKET.BOTTOM_OFFSET - 12,
    lifetime: EFFECTS.SPLAT,
    isGolden: egg.isGolden,
  });

  if (state.lives <= 0) {
    state.lives = 0;
    state.status = 'over';
  }
};

/** Ages effects and drops the expired ones so nothing leaks. */
const updateEffects = (state, dt) => {
  const alive = [];
  for (let i = 0; i < state.effects.length; i += 1) {
    const effect = state.effects[i];
    effect.age += dt;
    if (effect.age >= effect.lifetime) continue;
    if (effect.type === 'sparkle') {
      effect.x += effect.vx * dt;
      effect.y += effect.vy * dt;
      effect.vy += 260 * dt;
    }
    alive.push(effect);
  }
  state.effects = alive;
};

/**
 * Advances the whole simulation by `dt` seconds.
 *
 * Returns a summary of what happened this frame so the caller (React layer)
 * can fire sound effects without the engine needing to know about audio.
 */
export const stepGame = (state, dt, input) => {
  const events = { caught: 0, missed: 0, caughtGolden: 0, missedGolden: 0, gained: 0 };

  if (state.status !== 'running') {
    // Still age effects so the game-over screen can settle gracefully.
    updateEffects(state, dt);
    return events;
  }

  state.elapsed += dt;
  const difficulty = getDifficulty(state.elapsed);

  updateChicken(state.chicken, dt);
  updateBasket(state.basket, dt, input.move);

  // Spawning.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEggs(state, difficulty);
    state.spawnTimer = difficulty.spawnInterval * randRange(0.85, 1.15);
  }

  // Egg movement + collision resolution.
  const remaining = [];
  const line = catchLineY();
  const basket = basketRect(state.basket);

  for (let i = 0; i < state.eggs.length; i += 1) {
    const egg = state.eggs[i];
    egg.wobble += dt * 3;
    egg.vy += EGG.GRAVITY * dt;
    egg.y += egg.vy * dt;
    egg.x += egg.vx * dt;
    egg.rotation += egg.spin * dt;

    // Keep eggs inside the playfield horizontally (bounce off the walls).
    const halfW = EGG.WIDTH / 2;
    if (egg.x < halfW) {
      egg.x = halfW;
      egg.vx = Math.abs(egg.vx);
      egg.spin = Math.abs(egg.spin);
    } else if (egg.x > WORLD.WIDTH - halfW) {
      egg.x = WORLD.WIDTH - halfW;
      egg.vx = -Math.abs(egg.vx);
      egg.spin = -Math.abs(egg.spin);
    }

    const rect = eggRect(egg);

    // Caught? Only check once the egg has fallen to the basket rim.
    if (rect.y + rect.height >= line && rectsOverlap(rect, basket, CATCH_PADDING)) {
      onCatch(state, egg);
      events.caught += 1;
      events.gained += egg.isGolden ? SCORING.GOLDEN_EGG : SCORING.EGG;
      if (egg.isGolden) events.caughtGolden += 1;
      continue;
    }

    // Missed? The egg is fully below the playfield.
    if (egg.y - halfW > WORLD.HEIGHT) {
      onMiss(state, egg);
      events.missed += 1;
      if (egg.isGolden) events.missedGolden += 1;
      continue;
    }

    remaining.push(egg);
  }
  state.eggs = remaining;

  updateEffects(state, dt);

  if (state.score > state.highScore) {
    state.highScore = state.score;
  }

  return events;
};
