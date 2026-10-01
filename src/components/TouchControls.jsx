import { ArrowIcon } from './Art';

/**
 * On-screen left/right controls.
 * Always rendered (and hidden by CSS on pointer-fine devices) so touch users
 * get big, reliable targets. `touch-action: none` plus preventDefault stops the
 * page from scrolling while playing.
 */
const TouchControls = ({ onPress, onRelease, pressed }) => {
  const makeHandlers = (direction) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      // Capture so we reliably receive the matching pointerup.
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* not critical */
        }
      }
      onPress(direction);
    },
    onPointerUp: (event) => {
      event.preventDefault();
      onRelease(direction);
    },
    onPointerCancel: () => onRelease(direction),
    onPointerLeave: () => onRelease(direction),
    onContextMenu: (event) => event.preventDefault(),
  });

  return (
    <div className="touch-controls" aria-hidden="false">
      <button
        type="button"
        className={`touch-button ${pressed.left ? 'is-pressed' : ''}`}
        aria-label="Move basket left"
        {...makeHandlers('left')}
      >
        <ArrowIcon direction="left" />
      </button>
      <button
        type="button"
        className={`touch-button ${pressed.right ? 'is-pressed' : ''}`}
        aria-label="Move basket right"
        {...makeHandlers('right')}
      >
        <ArrowIcon direction="right" />
      </button>
    </div>
  );
};

export default TouchControls;
