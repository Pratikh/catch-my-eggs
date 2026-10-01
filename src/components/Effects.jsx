import { EggArt } from './Art';

/**
 * Renders the transient, self-expiring visual effects (score popups, combo
 * banners, catch sparkles and miss splats).
 *
 * Each effect carries its own `age`/`lifetime`, so the animation is driven
 * purely by data from the engine — no CSS keyframes and no timers. When the
 * engine drops an effect it simply disappears from this list.
 */
const Effects = ({ effects }) => (
  <>
    {effects.map((effect) => {
      const progress = effect.age / effect.lifetime;

      switch (effect.type) {
        case 'score':
          return (
            <div
              key={effect.id}
              className={`effect effect--score ${effect.isGolden ? 'is-golden' : ''}`}
              style={{
                left: effect.x,
                top: effect.y,
                opacity: 1 - progress * progress,
                transform: `translate(-50%, -50%) translateY(${-progress * 55}px) scale(${
                  1 + progress * 0.3
                })`,
              }}
            >
              +{effect.value}
            </div>
          );

        case 'combo':
          return (
            <div
              key={effect.id}
              className="effect effect--combo"
              style={{
                left: effect.x,
                top: effect.y,
                opacity: 1 - progress,
                transform: `translate(-50%, -50%) scale(${1 + progress * 0.4})`,
              }}
            >
              COMBO x{effect.value}!
            </div>
          );

        case 'sparkle':
          return (
            <div
              key={effect.id}
              className={`effect effect--sparkle ${effect.isGolden ? 'is-golden' : ''}`}
              style={{
                left: effect.x,
                top: effect.y,
                opacity: 1 - progress,
                transform: `translate(-50%, -50%) scale(${1 - progress * 0.5})`,
              }}
            />
          );

        case 'splat':
          return (
            <div
              key={effect.id}
              className="effect effect--splat"
              style={{
                left: effect.x,
                top: effect.y,
                opacity: 1 - progress,
                transform: `translate(-50%, -50%) scale(${0.8 + progress * 0.5})`,
              }}
            >
              <EggArt cracked className="art art--splat" />
            </div>
          );

        default:
          // Unknown effect types are ignored rather than crashing the frame.
          return null;
      }
    })}
  </>
);

export default Effects;