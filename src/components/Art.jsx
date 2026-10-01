
/**
 * Vector game art.
 *
 * The original project mixed photographic cut-outs (a real hen, real hands)
 * with cartoon GIFs whose backgrounds were baked-in yellow/black squares, so
 * they never composited cleanly over the farm background. These SVG versions
 * are crisp at every size, scale to any screen, tint faithfully, and add a few
 * KB to the bundle instead of several MB.
 */

/** The angry hen that patrols the top of the playfield. */
export const ChickenArt = ({ facing = 1, className = '' }) => (
  <svg
    viewBox="0 0 120 140"
    className={className}
    role="img"
    aria-label="Angry chicken"
    style={{ transform: `scaleX(${facing >= 0 ? 1 : -1})`, transformOrigin: 'center' }}
  >
    <defs>
      <radialGradient id="henBody" cx="42%" cy="34%" r="78%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="62%" stopColor="#f4f1e8" />
        <stop offset="100%" stopColor="#ddd6c4" />
      </radialGradient>
      <linearGradient id="combGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6b5e" />
        <stop offset="100%" stopColor="#d62f27" />
      </linearGradient>
    </defs>

    {/* Tail feathers */}
    <path
      d="M20 78c-8-12-10-24-4-30 5-5 13-1 18 9 4-13 4-24 11-26 8-2 11 8 10 22 5-9 12-14 17-10 6 5 3 17-5 28z"
      fill="#e7e2d4"
      stroke="#c2b9a3"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Body */}
    <ellipse cx="60" cy="82" rx="42" ry="38" fill="url(#henBody)" stroke="#c2b9a3" strokeWidth="2" />
    {/* Wing */}
    <path
      d="M46 74c12-6 30-5 40 3-6 12-20 20-33 17-9-2-12-13-7-20z"
      fill="#efeade"
      stroke="#c8bfa9"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Tail */}
    <path d="M22 66c-9-7-14-16-10-21 5-6 14 1 20 11z" fill="#f0ecdf" stroke="#c2b9a3" strokeWidth="2" strokeLinejoin="round" />

    {/* Head */}
    <circle cx="72" cy="36" r="25" fill="url(#henBody)" stroke="#c2b9a3" strokeWidth="2" />

    {/* Comb (angry hen crest) */}
    <path
      d="M56 14c1-7 7-11 12-8 2-7 9-9 13-4 3-6 11-5 12 2 5-2 9 3 7 9-8 5-30 7-44 1z"
      fill="url(#combGrad)"
      stroke="#a8241d"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    {/* Wattle */}
    <path d="M88 50c6-1 9 4 7 9-2 6-8 9-12 6-3-3-1-13 5-15z" fill="url(#combGrad)" stroke="#a8241d" strokeWidth="1.6" />

    {/* Beak */}
    <path d="M94 33l20 5-20 9z" fill="#ffb020" stroke="#d98a05" strokeWidth="1.8" strokeLinejoin="round" />

    {/* Angry brow + eye */}
    <path d="M62 26l16 5" stroke="#4a3f2f" strokeWidth="4" strokeLinecap="round" />
    <circle cx="70" cy="37" r="4.2" fill="#3a3128" />
    <circle cx="71.6" cy="35.4" r="1.4" fill="#ffffff" />

    {/* Legs */}
    <path d="M52 116l-2 16M74 116l2 16" stroke="#ffb020" strokeWidth="5" strokeLinecap="round" />
    <path d="M44 134h14M72 134h14" stroke="#ffb020" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

/** The player's basket. `squash` (0..1) drives the catch reaction. */
export const BasketArt = ({ squash = 0, className = '' }) => {
  const scaleY = 1 - squash * 0.16;
  const scaleX = 1 + squash * 0.1;
  return (
    <svg
      viewBox="0 0 132 96"
      className={className}
      role="img"
      aria-label="Basket"
      style={{ transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: 'bottom center' }}
    >
      <defs>
        <linearGradient id="basketBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2a45c" />
          <stop offset="100%" stopColor="#b9743a" />
        </linearGradient>
        <linearGradient id="basketRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7cf95" />
          <stop offset="100%" stopColor="#d99f57" />
        </linearGradient>
        <clipPath id="basketClip">
          <path d="M20 34h92l-11 55a6 6 0 0 1-6 5H37a6 6 0 0 1-6-5z" />
        </clipPath>
      </defs>

      {/* Opening (dark interior) */}
      <ellipse cx="66" cy="34" rx="46" ry="9" fill="#8a5628" />

      {/* Body */}
      <path d="M20 34h92l-11 55a6 6 0 0 1-6 5H37a6 6 0 0 1-6-5z" fill="url(#basketBody)" />

      {/* Woven texture */}
      <g clipPath="url(#basketClip)" stroke="#8f5a2c" strokeWidth="2" opacity="0.5">
        <path d="M28 34l6-40M48 34l3-40M70 34l0-40M92 34l-3-40" />
        <path d="M16 48h100M14 62h104M16 76h100M22 89h88" />
      </g>

      {/* Rim */}
      <ellipse cx="66" cy="34" rx="46" ry="10" fill="none" stroke="url(#basketRim)" strokeWidth="8" />
    </svg>
  );
};

/**
 * A single egg.
 *
 * Note: the gradient is defined *inline* on the fill rather than via a
 * `<defs>` + `id` reference. Many eggs are on screen at once, and duplicate
 * `id` attributes are invalid HTML — the browser resolves `url(#id)` against
 * the first match in the document, so a shared id would make every egg adopt
 * whichever gradient happened to render first (or none at all, leaving the
 * egg transparent). Keeping the gradient scoped inside each SVG avoids that.
 *
 * `golden` gives the rare bonus egg its sparkle; `cracked` renders the
 * splatted version used for the miss effect.
 */
export const EggArt = ({ golden = false, cracked = false, className = '' }) => {
  if (cracked) {
    return (
      <svg viewBox="0 0 40 52" className={className} role="img" aria-label="Broken egg">
        <ellipse cx="20" cy="42" rx="18" ry="8" fill="#fdf6e6" opacity="0.95" />
        <ellipse cx="20" cy="41" rx="9" ry="5" fill="#ffc93c" />
        <path d="M6 40l4-8 5 5 5-9 5 9 5-5 4 8z" fill="#fdf6e6" />
      </svg>
    );
  }

  // A plain white shell for normal eggs; a warm gold one for the bonus egg.
  const shell = golden
    ? { light: '#fffdf2', mid: '#ffd23f', dark: '#e09b00', edge: '#c98a00' }
    : { light: '#ffffff', mid: '#fbf7ee', dark: '#ece2cf', edge: '#cbb994' };

  return (
    <svg viewBox="0 0 40 52" className={className} role="img" aria-label={golden ? 'Golden egg' : 'Egg'}>
      <ellipse cx="20" cy="28" rx="17" ry="22" fill={shell.mid} stroke={shell.edge} strokeWidth="1.6" />
      {/* Soft shading, drawn as flat shapes so no shared gradient id is needed. */}
      <ellipse cx="20" cy="30" rx="13.5" ry="18" fill={shell.dark} opacity={golden ? 0.35 : 0.5} />
      <ellipse cx="20" cy="27.5" rx="15.5" ry="20" fill={shell.mid} />
      {/* Highlight */}
      <ellipse cx="13" cy="17" rx="5" ry="7" fill={shell.light} opacity="0.85" transform="rotate(-20 13 17)" />
      {golden && (
        <path d="M20 8l2.4 5.6L28 16l-5.6 2.4L20 24l-2.4-5.6L12 16l5.6-2.4z" fill="#fff8dc" opacity="0.9" />
      )}
    </svg>
  );
};

/** Small heart/life icon. */
export const HeartIcon = ({ filled = true }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 21s-8-5.1-8-10.4A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8 3.2C20 15.9 12 21 12 21z"
      fill={filled ? '#ff5c72' : 'none'}
      stroke={filled ? '#c9293f' : '#9aa7a0'}
      strokeWidth="1.8"
      strokeLinejoin="round"
      opacity={filled ? 1 : 0.55}
    />
  </svg>
);

/** Speaker / muted speaker toggle icon. */
export const SoundIcon = ({ muted = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {muted ? (
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    ) : (
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    )}
  </svg>
);

/** Paw/arrow used on the on-screen left/right buttons. */
export const ArrowIcon = ({ direction = 'left' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ transform: `scaleX(${direction === 'left' ? 1 : -1})` }}>
    <path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
