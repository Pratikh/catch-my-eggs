
/** Shared button used across every overlay, so focus/hover states stay consistent. */
const Button = ({ variant = 'primary', children, ...rest }) => (
  <button type="button" className={`btn btn--${variant}`} {...rest}>
    {children}
  </button>
);

export const StartScreen = ({ highScore, onStart, muted, onToggleMute }) => (
  <div className="overlay overlay--start" role="dialog" aria-modal="true" aria-labelledby="start-title">
    <div className="overlay__card">
      <div className="overlay__emoji" aria-hidden="true">
        🐔
      </div>
      <h2 className="overlay__title" id="start-title">
        Catch Me If You Can <span aria-hidden="true">🥚</span>
      </h2>
      <p className="overlay__subtitle">
        The chicken is angry. Catch the eggs before they hit the ground!
      </p>

      <Button variant="primary" onClick={onStart} data-testid="start-button">
        START GAME
      </Button>

      <div className="how-to">
        <div className="how-to__col">
          <h3>Desktop</h3>
          <ul>
            <li>
              <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to move
            </li>
            <li>
              <kbd>P</kbd> to pause
            </li>
          </ul>
        </div>
        <div className="how-to__col">
          <h3>Mobile</h3>
          <ul>
            <li>Drag anywhere on the field</li>
            <li>or use the ◀ ▶ buttons</li>
          </ul>
        </div>
      </div>

      <p className="overlay__hint">
        Catch eggs to score. Golden eggs are worth 5×. Drop {5} and it&apos;s game over.
        {highScore > 0 && (
          <>
            {' '}
            Your best is <strong>{highScore}</strong>.
          </>
        )}
      </p>

      <button
        type="button"
        className="link-button"
        onClick={onToggleMute}
        aria-pressed={muted}
      >
        Sound: {muted ? 'OFF 🔇' : 'ON 🔊'}
      </button>
    </div>
  </div>
);

export const PauseScreen = ({ onResume, onRestart }) => (
  <div className="overlay overlay--pause" role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <div className="overlay__card overlay__card--compact">
      <h2 className="overlay__title overlay__title--sm" id="pause-title">
        Paused
      </h2>
      <p className="overlay__subtitle">Take a breath. The chicken will wait.</p>
      <div className="overlay__actions">
        <Button variant="primary" onClick={onResume}>
          RESUME
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          RESTART
        </Button>
      </div>
    </div>
  </div>
);

export const GameOverScreen = ({ score, highScore, isNewHighScore, onRestart, onMenu }) => (
  <div className="overlay overlay--over" role="dialog" aria-modal="true" aria-labelledby="over-title">
    <div className="overlay__card">
      <div className="overlay__emoji" aria-hidden="true">
        {isNewHighScore ? '🏆' : '🐔'}
      </div>
      <h2 className="overlay__title" id="over-title">
        GAME OVER
      </h2>

      {isNewHighScore && <p className="overlay__ribbon">New best score!</p>}

      <dl className="results">
        <div className="results__row">
          <dt>Score</dt>
          <dd data-testid="final-score">{score}</dd>
        </div>
        <div className="results__row">
          <dt>Best Score</dt>
          <dd data-testid="final-best">{highScore}</dd>
        </div>
      </dl>

      <div className="overlay__actions">
        <Button variant="primary" onClick={onRestart} data-testid="play-again">
          PLAY AGAIN
        </Button>
        <Button variant="ghost" onClick={onMenu}>
          MAIN MENU
        </Button>
      </div>
    </div>
  </div>
);
