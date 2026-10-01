# Catch Me If You Can 🥚

> 🐔 is very angry on its owner so its not giving 🥚 in proper place, so need your help to catch eggs!!...

The chicken patrols the top of the farm and drops eggs wherever it likes. Move your
basket, catch them before they hit the ground, and don't let five slip past you.

**[▶ Play it here](https://pratikh.github.io/catch-my-eggs/)**

---

## Features

- **Catch falling eggs** with a basket you move along the bottom of the field.
- **Combo scoring** — consecutive catches build a streak for bonus points.
- **Golden eggs** worth 5×, which show up more often as you improve.
- **Gradual difficulty** — eggs fall faster, spawn closer together and start
  arriving in pairs, ramping smoothly over the first ~95 seconds and then
  levelling off so it stays fair.
- **5 lives.** Miss an egg and you lose one; the screen shakes and the egg splats.
- **High score** saved in `localStorage`, so your best survives a refresh.
- **Sound effects** for catching, missing, buttons and game over — synthesised in
  the browser with the Web Audio API, so there are no audio files to download.
  Mute any time; nothing plays until you interact with the page.
- **Fully responsive** — playable with a mouse, keyboard, or touch (drag anywhere
  or use the on-screen ◀ ▶ buttons).
- **Pause** at any time with <kbd>P</kbd> or the pause button.
- **Accessible** — keyboard-operable buttons, visible focus rings, ARIA labels for
  lives/score/sound, and game state is never communicated by colour alone.

## Controls

| | |
|---|---|
| **Desktop** | <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to move · <kbd>P</kbd> to pause |
| **Mobile / tablet** | Drag anywhere on the field, or hold the on-screen ◀ ▶ buttons |

## Run it locally

Requires Node 18+.

```bash
npm install
npm start          # dev server on http://localhost:3000
```

## Build

```bash
npm run build      # outputs to build/
npm run preview    # serve the production build locally
```

## Tests & lint

```bash
npm test           # 26 unit/component tests (Vitest + Testing Library)
npm run lint       # ESLint
```

The game logic in `src/game/engine.js` is a pure, framework-free module, so the
physics, collision, difficulty curve and scoring are all unit tested directly.

## Project structure

```
index.html               Vite entry
src/
  main.jsx               React entry point
  App.jsx                Thin app shell
  components/
    Game.jsx             Wires the engine, loop, input, audio and rendering
    Hud.jsx              Score / best / lives / sound / pause
    Overlays.jsx         Start, pause and game-over screens
    TouchControls.jsx    On-screen left/right buttons
    Art.jsx              Inline SVG chicken, basket and eggs
  game/
    config.js            All tunable constants in one place
    engine.js            Pure simulation: spawning, physics, collision, scoring
    audio.js             Web Audio sound engine (no asset files)
  hooks/
    useGameLoop.js       Single requestAnimationFrame loop
    useControls.js       Keyboard + on-screen input
    index.js             Persistence and element-size hooks
  styles/                Global and game CSS
scripts/
  browser-check.mjs      Playwright end-to-end check (58 assertions)
```

## Architecture notes

- **One animation loop.** A single `requestAnimationFrame` loop drives the whole
  simulation and stops completely on pause, game over and unmount — verified at
  exactly 60 fps while running and 0 fps when stopped.
- **Fixed virtual world.** The game simulates on a 1000×700 world that is scaled
  uniformly to the available space, so behaviour is identical on every device.
- **State lives in a ref.** React only receives a lightweight snapshot for the
  HUD, which keeps re-renders cheap while the playfield repaints every frame.
- **Eggs and effects are removed** from state as soon as they leave play, so
  nothing accumulates during a long session.

## Deploying to GitHub Pages

The site is published from the `gh-pages` branch by
[`.github/workflows/main.yml`](.github/workflows/main.yml) on every push to `main`.

Because the project is served from a sub-path, `vite.config.mjs` sets
`base: '/catch-my-eggs/'` for production builds. All assets (including the CSS
background image) are emitted with that prefix, and the web manifest uses a
relative `start_url`, so everything resolves correctly under
`https://pratikh.github.io/catch-my-eggs/`.

If you fork this and rename the repository, update `base` in `vite.config.mjs`
and `homepage` in `package.json` to match the new path.

## Assets

The cartoon farm background is the original `farm.jpg` from this project. The
chicken, basket and eggs are inline SVG drawn for this rebuild — they stay crisp
at any size and add only a few KB. Sound is synthesised at runtime, so the
repository contains no third-party audio or graphics.

## License

[MIT](LICENSE) © Pratik