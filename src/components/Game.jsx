import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASKET, CHICKEN, EGG, GAME_STATE, WORLD } from '../game/config';
import { catchLineY, createState, stepGame } from '../game/engine';
import { unlock, sfx, setMuted as setAudioMuted } from '../game/audio';
import { useHighScore, useMuted, useElementSize } from '../hooks';
import { useControls } from '../hooks/useControls';
import { useGameLoop } from '../hooks/useGameLoop';
import { BasketArt, ChickenArt, EggArt } from './Art';
import Effects from './Effects';
import Hud from './Hud';
import TouchControls from './TouchControls';
import { GameOverScreen, PauseScreen, StartScreen } from './Overlays';
import '../styles/game.css';

/** Pulls the small, render-relevant slice of state out of the live game state. */
const deriveSnapshot = (state) => ({
  score: state.score,
  lives: state.lives,
  missed: state.missed,
  caught: state.caught,
  combo: state.combo,
  status: state.status,
  bestCombo: state.bestCombo,
});

const Game = () => {
  const [highScore, setHighScore] = useHighScore();
  const [muted, setMuted] = useMuted();

  const [playfieldRef, size] = useElementSize();

  // The live simulation lives in a ref; React only ever sees snapshots.
  const stateRef = useRef(null);
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;
  /** The best score as last written to localStorage (never updated mid-run). */
  const persistedHighScoreRef = useRef(highScore);

  const [uiState, setUiState] = useState(GAME_STATE.IDLE);
  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  const [snapshot, setSnapshot] = useState(() => deriveSnapshot(createState(highScore)));
  const snapshotRef = useRef(snapshot);

  // Final results are frozen when the game ends so the overlay can't flicker.
  const [result, setResult] = useState(null);

  // Start on the menu; the loop only runs while actually playing.
  if (stateRef.current === null) {
    stateRef.current = createState(highScore);
    stateRef.current.status = GAME_STATE.IDLE;
  }

  const isRunning = uiState === GAME_STATE.RUNNING;

  // Keep the audio engine's mute flag in sync with persisted preference.
  useEffect(() => {
    setAudioMuted(muted);
  }, [muted]);

  /**
   * Publishes the current frame to React.
   *
   * The render tree draws eggs/basket/effects straight from the live state, so
   * a new snapshot object must be published every frame for them to move. The
   * *object identity* changes each frame, but the HUD's numbers do not, and the
   * HUD is a tiny subtree — this is what keeps the frame budget small while
   * still repainting the playfield at the full loop rate.
   */
  const publishSnapshot = useCallback(() => {
    snapshotRef.current = deriveSnapshot(stateRef.current);
    setSnapshot(snapshotRef.current);
  }, []);

  const handleGameOver = useCallback(
    (state) => {
      const finalScore = state.score;
      const best = Math.max(highScoreRef.current, finalScore);
      // Compare against the *persisted* best, not the running session best
      // (`highScoreRef` tracks the current run too, so it would already equal
      // finalScore here and the save would never happen).
      const isNewHighScore = finalScore > persistedHighScoreRef.current;

      if (isNewHighScore) {
        persistedHighScoreRef.current = finalScore;
        setHighScore(finalScore);
      }

      setResult({ score: finalScore, highScore: best, isNewHighScore, caught: state.caught, bestCombo: state.bestCombo });
      setUiState(GAME_STATE.OVER);
      sfx.gameOver();
      if (isNewHighScore) {
        window.setTimeout(() => sfx.highScore(), 700);
      }
    },
    [setHighScore],
  );

  /** One simulation frame. Reads live input from refs — no re-render cost. */
  const step = useCallback(
    (dt) => {
      const state = stateRef.current;
      if (state.status !== GAME_STATE.RUNNING) return;

      const previousLives = state.lives;
      const events = stepGame(state, dt, { move: controlsRef.current.moveRef.current });

      if (events.caught > 0) {
        if (events.caughtGolden > 0) sfx.catchGolden();
        else sfx.catch();
      }
      if (events.missed > 0) sfx.miss();

      // Score may have beaten the stored high score mid-run.
      if (state.score > highScoreRef.current) {
        highScoreRef.current = state.score;
      }

      if (state.status === GAME_STATE.OVER) {
        handleGameOver(state);
      } else if (previousLives !== state.lives && state.lives <= 0) {
        handleGameOver(state);
      }
    },
    [handleGameOver],
  );

  // Input is disabled on the start/game-over screens so arrow keys don't
  // scroll an overlay. The ref is read by `step` without causing re-renders.
  const controlsRef = useRef(null);
  const controls = useControls({
    enabled: isRunning,
    onPauseToggle: () => {
      setUiState((prev) => {
        if (prev === GAME_STATE.RUNNING) return GAME_STATE.PAUSED;
        if (prev === GAME_STATE.PAUSED) return GAME_STATE.RUNNING;
        return prev;
      });
    },
    onAnyInput: () => unlock(),
  });
  controlsRef.current = controls;

  useGameLoop({
    step,
    onFrame: publishSnapshot,
    running: isRunning,
  });

  // Keep the engine's status field aligned with the UI status.
  useEffect(() => {
    stateRef.current.status = uiState;
  }, [uiState]);

  useEffect(() => {
    publishSnapshot();
  }, [publishSnapshot]);

  /** Resets the simulation in place — no page reload, no leaked loops. */
  const resetState = useCallback(
    (status) => {
      const fresh = createState(highScoreRef.current);
      fresh.status = status;
      stateRef.current = fresh;
      snapshotRef.current = deriveSnapshot(fresh);
      setSnapshot(snapshotRef.current);
      setResult(null);
      setUiState(status);
    },
    [],
  );

  const startGame = useCallback(() => {
    unlock();
    sfx.start();
    const fresh = createState(highScoreRef.current);
    fresh.status = GAME_STATE.RUNNING;
    stateRef.current = fresh;
    snapshotRef.current = deriveSnapshot(fresh);
    setSnapshot(snapshotRef.current);
    setResult(null);
    setUiState(GAME_STATE.RUNNING);
  }, []);

  const toggleMute = useCallback(() => {
    unlock();
    setMuted((prev) => {
      const next = !prev;
      if (!next) sfx.click();
      return next;
    });
  }, [setMuted]);

  // ---- Pointer / touch dragging -------------------------------------------
  const dragPointerIdRef = useRef(null);

  const pointerToWorldX = useCallback(
    (clientX) => {
      const node = playfieldRef.current;
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0) return null;
      const fraction = (clientX - rect.left) / rect.width;
      return fraction * WORLD.WIDTH;
    },
    [playfieldRef],
  );

  const onPointerDown = useCallback(
    (event) => {
      if (!isRunning) return;
      unlock();
      dragPointerIdRef.current = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* not critical */
      }
      const worldX = pointerToWorldX(event.clientX);
      if (worldX !== null) {
        // The engine's basket owns the pointer target; keyboard input clears it.
        stateRef.current.basket.pointerTargetX = worldX;
      }
    },
    [isRunning, pointerToWorldX],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!isRunning || dragPointerIdRef.current !== event.pointerId) return;
      const worldX = pointerToWorldX(event.clientX);
      if (worldX !== null) {
        stateRef.current.basket.pointerTargetX = worldX;
      }
    },
    [isRunning, pointerToWorldX],
  );

  const endDrag = useCallback((event) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    stateRef.current.basket.pointerTargetX = null;
  }, []);

  // Arrow keys should not scroll the page even while an overlay is up.
  useEffect(() => {
    const blockScrollKeys = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        if (event.target === document.body || event.target === document.documentElement) {
          event.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', blockScrollKeys, { passive: false });
    return () => window.removeEventListener('keydown', blockScrollKeys);
  }, []);

  /**
   * Scale the fixed 1000x700 world into the available pixels.
   *
   * The factor is always uniform so nothing is distorted:
   *  - Landscape / wide fields: fit the whole world, letterboxing the sides.
   *  - Portrait fields (taller than the world's aspect): scale to fill the
   *    width so the farm does not look tiny, but never past the height-fit —
   *    that keeps the chicken's head and the basket's base both on screen.
   */
  const scale = useMemo(() => {
    if (!size.width || !size.height) return 0;
    const fitWidth = size.width / WORLD.WIDTH;
    const fitHeight = size.height / WORLD.HEIGHT;
    return Math.min(fitWidth, fitHeight);
  }, [size.width, size.height]);

  const ready = scale > 0;
  const renderState = stateRef.current;
  const paused = uiState === GAME_STATE.PAUSED;

  return (
    <div className="game-shell">
      <div className="game-card">
        <Hud
          score={snapshot.score}
          highScore={Math.max(highScore, snapshot.score)}
          lives={snapshot.lives}
          combo={snapshot.combo}
          muted={muted}
          onToggleMute={toggleMute}
          onPauseToggle={() =>
            setUiState((prev) =>
              prev === GAME_STATE.RUNNING
                ? GAME_STATE.PAUSED
                : prev === GAME_STATE.PAUSED
                  ? GAME_STATE.RUNNING
                  : prev,
            )
          }
          paused={paused}
        />

        <div
          className={`playfield ${renderState.shakeUntil > renderState.elapsed ? 'is-shaking' : ''}`}
          ref={playfieldRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="application"
          aria-label="Catch Me If You Can game area"
        >
          {ready && (
            <div
              className="world"
              data-scale={scale.toFixed(4)}
              style={{
                width: WORLD.WIDTH,
                height: WORLD.HEIGHT,
                // Centred in the playfield; the scale keeps the whole world
                // (chicken at the top, basket at the bottom) on screen.
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {/* Ground / horizon band is part of the farm background image. */}

              {/* Chicken */}
              <div
                className="world__chicken"
                style={{
                  left: renderState.chicken.x,
                  top:
                    CHICKEN.CENTER_Y +
                    Math.sin(renderState.chicken.bobPhase) * CHICKEN.BOB_AMPLITUDE,
                  width: CHICKEN.WIDTH,
                  height: CHICKEN.HEIGHT,
                }}
              >
                <ChickenArt facing={renderState.chicken.facing} className="art art--chicken" />
              </div>

              {/* Eggs */}
              {renderState.eggs.map((egg) => (
                <div
                  key={egg.id}
                  className={`world__egg ${egg.isGolden ? 'is-golden' : ''}`}
                  style={{
                    left: egg.x,
                    top: egg.y,
                    width: EGG.WIDTH,
                    height: EGG.HEIGHT,
                    transform: `translate(-50%, -50%) rotate(${egg.rotation}deg)`,
                  }}
                >
                  <EggArt golden={egg.isGolden} className="art art--egg" />
                </div>
              ))}

              {/* Basket */}
              <div
                className="world__basket"
                style={{
                  left: renderState.basket.x,
                  top: catchLineY(),
                  width: BASKET.WIDTH,
                  height: BASKET.HEIGHT,
                }}
              >
                <BasketArt squash={renderState.basket.squash} className="art art--basket" />
              </div>

              {/* Transient effects */}
              <Effects effects={renderState.effects} />
            </div>
          )}

          {uiState === GAME_STATE.IDLE && (
            <StartScreen
              highScore={highScore}
              onStart={startGame}
              muted={muted}
              onToggleMute={toggleMute}
            />
          )}

          {uiState === GAME_STATE.PAUSED && (
            <PauseScreen
              onResume={() => setUiState(GAME_STATE.RUNNING)}
              onRestart={startGame}
            />
          )}

          {uiState === GAME_STATE.OVER && result && (
            <GameOverScreen
              score={result.score}
              highScore={result.highScore}
              isNewHighScore={result.isNewHighScore}
              onRestart={startGame}
              onMenu={() => resetState(GAME_STATE.IDLE)}
            />
          )}
        </div>

        <TouchControls
          onPress={controls.pressButton}
          onRelease={controls.releaseButton}
          pressed={controls.buttonState}
        />

        <footer className="game-footer">
          <span className="game-footer__hint">
            <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> to move · <kbd>P</kbd> to pause · drag on
            touch screens
          </span>
          <span className="game-footer__status" aria-live="polite">
            {uiState === GAME_STATE.IDLE && 'Press START GAME to play'}
            {uiState === GAME_STATE.RUNNING && `Caught ${snapshot.caught} · Missed ${snapshot.missed}`}
            {uiState === GAME_STATE.PAUSED && 'Paused'}
            {uiState === GAME_STATE.OVER && 'Game over — press PLAY AGAIN'}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Game;
