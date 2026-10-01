import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BasketArt, ChickenArt, EggArt } from './Art';

/**
 * Regression tests for the SVG art.
 *
 * The eggs previously used `<defs>` + `id` gradients shared across every
 * instance. Because several eggs are mounted at once, those duplicate ids made
 * `url(#…)` resolve unpredictably (and, when the referenced gradient was not
 * mounted, painted nothing — leaving the egg transparent). These tests pin the
 * fix: art must be self-contained and must not rely on document-wide ids.
 */
describe('game art', () => {
  it('renders the white egg with an opaque fill and no id references', () => {
    const { container } = render(<EggArt />);
    const svg = container.querySelector('svg');
    const fill = svg.querySelector('ellipse').getAttribute('fill');

    expect(fill).toBeTruthy();
    expect(fill).not.toMatch(/^url\(/);
    expect(svg.querySelectorAll('[id]')).toHaveLength(0);
  });

  it('renders the golden egg distinctly from the white egg', () => {
    const white = render(<EggArt />).container.querySelector('ellipse').getAttribute('fill');
    const golden = render(<EggArt golden />).container.querySelector('ellipse').getAttribute('fill');

    expect(golden).not.toBe(white);
  });

  it('keeps every instance self-contained so ids cannot collide', () => {
    // Two eggs on screen is the common case; three is a pair plus an extra.
    const { container } = render(
      <div>
        <EggArt />
        <EggArt />
        <EggArt golden />
      </div>,
    );

    const ids = [...container.querySelectorAll('svg [id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    // Nothing may point at a document-wide id.
    const refs = [...container.querySelectorAll('svg [fill], svg [stroke], svg [clip-path]')]
      .map((el) => el.getAttribute('fill') || el.getAttribute('stroke') || el.getAttribute('clip-path'))
      .filter(Boolean);
    expect(refs.some((value) => value.startsWith('url(#'))).toBe(false);
  });

  it('renders the cracked egg used by the miss effect', () => {
    const { container } = render(<EggArt cracked />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('ellipse')).toBeTruthy();
  });

  it('renders the basket and chicken with accessible labels', () => {
    const basket = render(<BasketArt squash={0.5} />);
    expect(basket.getByRole('img', { name: /basket/i })).toBeInTheDocument();

    const chicken = render(<ChickenArt facing={-1} />);
    expect(chicken.getByRole('img', { name: /chicken/i })).toBeInTheDocument();
  });
});