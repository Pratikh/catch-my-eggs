import { HeartIcon, SoundIcon } from './Art';
import { RULES } from '../game/config';

/**
 * Top bar: title, score, best score and lives.
 * Lives are conveyed by both a heart count and a text label so the state is
 * never communicated by colour alone (accessibility).
 */
const Hud = ({ score, highScore, lives, combo, muted, onToggleMute, onPauseToggle, paused }) => {
  const isNewBest = score > 0 && score >= highScore;

  return (
    <header className="hud">
      <div className="hud__group">
        <div className="hud__stat">
          <span className="hud__label">Score</span>
          <strong className="hud__value" data-testid="score">
            {score}
          </strong>
        </div>
        <div className="hud__stat hud__stat--best">
          <span className="hud__label">Best</span>
          <strong className="hud__value">{highScore}</strong>
          {isNewBest && <span className="hud__badge">NEW!</span>}
        </div>
      </div>

      <h1 className="hud__title">
        Catch Me If You Can <span aria-hidden="true">🥚</span>
      </h1>

      <div className="hud__group hud__group--right">
        {combo >= 3 && (
          <div className="hud__combo" data-testid="combo">
            <span aria-hidden="true">🔥</span> x{combo}
          </div>
        )}
        <div className="hud__lives" aria-label={`Lives remaining: ${lives} of ${RULES.LIVES}`}>
          <span className="hud__label">Lives</span>
          <div className="hud__hearts" role="img" aria-hidden="true">
            {Array.from({ length: RULES.LIVES }, (_, i) => (
              <span key={i} className={`hud__heart ${i < lives ? '' : 'is-lost'}`}>
                <HeartIcon filled={i < lives} />
              </span>
            ))}
          </div>
          <span className="hud__sr">{lives} of {RULES.LIVES} lives left</span>
        </div>

        <div className="hud__buttons">
          <button
            type="button"
            className="icon-button"
            onClick={onPauseToggle}
            aria-label={paused ? 'Resume game' : 'Pause game'}
            title={paused ? 'Resume (P)' : 'Pause (P)'}
          >
            {paused ? '▶' : '❚❚'}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute sound' : 'Mute sound'}
          >
            <SoundIcon muted={muted} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hud;
