/**
 * Game configuration — every tunable value lives here.
 * All positions/sizes are expressed in "world units" on a fixed virtual
 * playfield, so the simulation is identical on every screen size. The
 * renderer scales the world to whatever pixels are actually available.
 */
export const WORLD = {
  WIDTH: 1000,
  HEIGHT: 700,
};

/** The chicken that patrols the top of the screen. */
export const CHICKEN = {
  WIDTH: 120,
  HEIGHT: 140,
  /**
   * World-space *centre* y of the chicken. Must be at least HEIGHT / 2 plus the
   * idle-bob amplitude so the bird never clips the top of the playfield.
   */
  CENTER_Y: 78,
  /** Horizontal safe margins so the bird never clips the edges. */
  MARGIN_X: 60,
  /** Pixels per second while patrolling. */
  SPEED: 150,
  /** Idle bob amplitude / speed. */
  BOB_AMPLITUDE: 6,
  BOB_SPEED: 2.4,
  /** Pause at each end of the patrol before turning around (seconds). */
  TURN_PAUSE: 0.35,
};

/** The player's basket. */
export const BASKET = {
  WIDTH: 132,
  HEIGHT: 96,
  /** Distance from the bottom edge of the world. */
  BOTTOM_OFFSET: 26,
  /** Keyboard acceleration / maximum speed (px per second). */
  SPEED: 620,
  ACCELERATION: 4200,
  FRICTION: 3600,
  /** How quickly the basket eases toward a touch/drag target. */
  POINTER_LERP: 18,
};

export const EGG = {
  WIDTH: 40,
  HEIGHT: 52,
  /** Spawn speed range (px per second) before difficulty scaling. */
  MIN_SPEED: 165,
  MAX_SPEED: 235,
  /** Horizontal drift the egg picks up as it falls. */
  MAX_DRIFT: 55,
  /** ± jitter applied to the chicken's position at spawn time. */
  SPAWN_JITTER: 34,
  GRAVITY: 26,
};

/** Difficulty ramps up smoothly and then plateaus so it never turns unfair. */
export const DIFFICULTY = {
  /** Seconds of play before difficulty reaches its maximum. */
  RAMP_SECONDS: 95,
  /** Spawn interval (seconds) at the start and once fully ramped. */
  START_INTERVAL: 1.15,
  MIN_INTERVAL: 0.42,
  /** Multiplier applied to egg fall speed at the start / end of the ramp. */
  START_SPEED_SCALE: 1,
  MAX_SPEED_SCALE: 1.75,
  /** Chance a spawn releases two eggs at once, at the start / end. */
  START_DOUBLE_CHANCE: 0,
  MAX_DOUBLE_CHANCE: 0.22,
  /** Chance an egg is a golden bonus egg, at the start / end. */
  START_GOLDEN_CHANCE: 0,
  MAX_GOLDEN_CHANCE: 0.12,
};

export const SCORING = {
  /** Points for catching a regular egg. */
  EGG: 10,
  /** Points for catching a golden egg. */
  GOLDEN_EGG: 50,
  /**
   * Combo bonus: the Nth consecutive catch adds `COMBO_STEP * (N-1)`,
   * capped so a long streak stays rewarding but bounded.
   */
  COMBO_STEP: 2,
  COMBO_MAX_BONUS: 20,
};

export const RULES = {
  LIVES: 5,
  /** Minimum horizontal distance between two eggs spawned as a pair. */
  PAIR_SEPARATION: 150,
};

/** How long transient visual effects stay on screen (seconds). */
export const EFFECTS = {
  SCORE_POPUP: 0.9,
  SPLAT: 0.7,
  SPARKLE: 0.6,
  COMBO_BANNER: 0.9,
};

export const STORAGE_KEYS = {
  HIGH_SCORE: 'catch-my-eggs:high-score',
  MUTED: 'catch-my-eggs:muted',
};

export const GAME_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  OVER: 'over',
};
