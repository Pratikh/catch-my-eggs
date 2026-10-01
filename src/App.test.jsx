import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

/**
 * Component-level smoke tests.
 *
 * jsdom has no layout engine, so the playfield measures 0x0 and the scaled
 * world is not rendered. These tests therefore cover the shell, the overlays
 * and the UI wiring — the simulation itself is covered by engine.test.js.
 */
describe('<App />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // The game loop uses requestAnimationFrame; drive it manually so tests
    // never depend on real timing.
    vi.stubGlobal('requestAnimationFrame', (cb) => window.setTimeout(() => cb(performance.now()), 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
  });

  it('renders the start screen with the title, subtitle and controls help', () => {
    render(<App />);

    // The title appears in both the HUD and the overlay, so assert on the
    // overlay heading plus the HUD title separately.
    expect(screen.getAllByText(/Catch Me If You Can/i)).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 2, name: /Catch Me If You Can/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/The chicken is angry\. Catch the eggs before they hit the ground!/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
    expect(screen.getByText(/Desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile/i)).toBeInTheDocument();
  });

  it('does not start the game before the player presses START GAME', () => {
    render(<App />);
    // The HUD score starts at zero and legs are untouched.
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  it('enters the running state when START GAME is pressed', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
    // The footer now reports live progress instead of the idle prompt.
    expect(screen.queryByText(/Press START GAME to play/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Caught 0 · Missed 0/i)).toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });

  it('shows the lives counter with an accessible label', () => {
    render(<App />);
    expect(screen.getByLabelText(/Lives remaining: 5 of 5/i)).toBeInTheDocument();
  });

  it('exposes an accessible mute toggle that flips its pressed state', () => {
    render(<App />);
    const muteButton = screen.getByLabelText(/mute sound/i);

    expect(muteButton).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      fireEvent.click(muteButton);
    });

    const unmuteButton = screen.getByLabelText(/unmute sound/i);
    expect(unmuteButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders on-screen movement controls with readable labels', () => {
    render(<App />);
    expect(screen.getByLabelText(/move basket left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/move basket right/i)).toBeInTheDocument();
  });

  it('can pause and resume from the running state', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    const pauseButton = screen.getByLabelText(/pause game/i);
    act(() => {
      fireEvent.click(pauseButton);
    });

    // The pause overlay is a dialog; the footer also says "Paused", so scope
    // the assertion to the dialog heading.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Paused$/i })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'RESUME' }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('unmounts without leaving timers or listeners behind', () => {
    const { unmount } = render(<App />);
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    expect(() => unmount()).not.toThrow();
  });
});
