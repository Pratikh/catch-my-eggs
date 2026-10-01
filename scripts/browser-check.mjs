/**
 * Real-browser verification for Catch Me If You Can.
 *
 * Drives the locally running dev server in Chrome and checks gameplay,
 * console health, responsive behaviour and asset loading.
 *
 * Usage: node scripts/browser-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000/';

const VIEWPORTS = [
  { name: 'mobile-375x667', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'laptop-1280x720', width: 1280, height: 720, isMobile: false, hasTouch: false },
  { name: 'desktop-1440x900', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

const results = [];
let failures = 0;

const check = (label, condition, detail = '') => {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

/** Waits until the game reports a given score, or times out. */
const waitForScoreAbove = async (page, target, timeout = 60000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const score = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="score"]');
      return el ? Number(el.textContent) : 0;
    });
    if (score > target) return score;
    await page.waitForTimeout(250);
  }
  return null;
};

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  // ---------------------------------------------------------------- desktop --
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('requestfailed', (req) => failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`));

    await page.goto(BASE, { waitUntil: 'networkidle' });

    check('desktop: page title correct', (await page.title()).includes('Catch Me If You Can'));
    check('desktop: start screen visible', await page.getByTestId('start-button').isVisible());
    check(
      'desktop: subtitle present',
      (await page.getByText(/The chicken is angry/i).count()) > 0,
    );

    // Start the game.
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(400);
    check('desktop: overlay dismissed after START', (await page.getByTestId('start-button').count()) === 0);

    // The world should be rendered and scaled.
    const worldBox = await page.locator('.world').boundingBox();
    check('desktop: world rendered', worldBox && worldBox.width > 200, JSON.stringify(worldBox));

    // ---- Keyboard control -------------------------------------------------
    const basketBefore = await page.locator('.world__basket').boundingBox();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    const basketAfterRight = await page.locator('.world__basket').boundingBox();
    check(
      'desktop: ArrowRight moves basket right',
      basketAfterRight.x > basketBefore.x + 20,
      `${basketBefore.x.toFixed(1)} -> ${basketAfterRight.x.toFixed(1)}`,
    );

    await page.keyboard.down('a');
    await page.waitForTimeout(700);
    await page.keyboard.up('a');
    await page.waitForTimeout(150);
    const basketAfterLeft = await page.locator('.world__basket').boundingBox();
    check(
      'desktop: "A" moves basket left',
      basketAfterLeft.x < basketAfterRight.x - 20,
      `${basketAfterRight.x.toFixed(1)} -> ${basketAfterLeft.x.toFixed(1)}`,
    );

    // ---- Basket stays in bounds ------------------------------------------
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(2500);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(120);
    const leftEdge = await page.locator('.world__basket').boundingBox();
    const fieldBox = await page.locator('.playfield').boundingBox();
    check(
      'desktop: basket clamped to left edge',
      leftEdge.x >= fieldBox.x - 2,
      `basket ${leftEdge.x.toFixed(1)} vs field ${fieldBox.x.toFixed(1)}`,
    );

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(120);
    const rightEdge = await page.locator('.world__basket').boundingBox();
    const fieldBox2 = await page.locator('.playfield').boundingBox();
    check(
      'desktop: basket clamped to right edge',
      rightEdge.x + rightEdge.width <= fieldBox2.x + fieldBox2.width + 2,
      `basket right ${(rightEdge.x + rightEdge.width).toFixed(1)} vs field right ${(fieldBox2.x + fieldBox2.width).toFixed(1)}`,
    );

    // ---- Scoring actually happens ----------------------------------------
    // Play for real: repeatedly read the lowest egg and hold the arrow key
    // that steers the basket toward it. This exercises input + collision +
    // scoring end to end rather than poking at internals.
    let caughtSomething = false;
    let held = null;
    const playUntil = Date.now() + 12000;
    while (Date.now() < playUntil) {
      const dir = await page.evaluate(() => {
        const eggs = Array.from(document.querySelectorAll('.world__egg'));
        const b = document.querySelector('.world__basket');
        if (!eggs.length || !b) return 0;
        const lowest = eggs
          .map((e) => ({ el: e, top: parseFloat(e.style.top) }))
          .sort((a, z) => z.top - a.top)[0];
        const delta = parseFloat(lowest.el.style.left) - parseFloat(b.style.left);
        return Math.abs(delta) < 10 ? 0 : Math.sign(delta);
      });

      const want = dir === 1 ? 'ArrowRight' : dir === -1 ? 'ArrowLeft' : null;
      if (want !== held) {
        if (held) await page.keyboard.up(held);
        if (want) await page.keyboard.down(want);
        held = want;
      }
      await page.waitForTimeout(60);

      const caught = await page.evaluate(() => {
        const el = document.querySelector('.game-footer__status');
        const m = el && el.textContent.match(/Caught (\d+)/);
        return m ? Number(m[1]) : 0;
      });
      if (caught > 0) {
        caughtSomething = true;
        break;
      }
    }
    if (held) await page.keyboard.up(held);

    check('desktop: catching an egg increases the caught count', caughtSomething);

    const scoreAfterCatch = Number(await page.getByTestId('score').textContent());
    check('desktop: score is greater than zero after catching', scoreAfterCatch > 0, String(scoreAfterCatch));

    const caughtCount = await page.evaluate(() => {
      const el = document.querySelector('.game-footer__status');
      return el ? el.textContent : '';
    });
    check('desktop: footer reports progress', /Caught \d+/.test(caughtCount), caughtCount);

    // ---- Mute toggle ------------------------------------------------------
    // The HUD stays visible on every screen, so this works regardless of
    // whether the autoplay above has already ended the run.
    const muteBtn = page.getByLabel(/mute sound/i);
    if ((await muteBtn.count()) > 0) {
      await muteBtn.click();
      await page.waitForTimeout(200);
      check('desktop: mute toggles', (await page.getByLabel(/unmute sound/i).count()) === 1);
      const persisted = await page.evaluate(() => localStorage.getItem('catch-my-eggs:muted'));
      check('desktop: mute persisted to localStorage', persisted === 'true', String(persisted));
      await page.getByLabel(/unmute sound/i).click();
      await page.waitForTimeout(200);
    } else {
      check('desktop: mute toggle available', false, 'no mute button found');
    }

    // ---- Pause ------------------------------------------------------------
    // Start from a guaranteed fresh game: the clamp/autoplay steps above may
    // already have drained enough lives to trigger game over on a fast build.
    if ((await page.getByTestId('play-again').count()) > 0) {
      await page.getByTestId('play-again').click();
      await page.waitForTimeout(400);
    }
    await page.getByLabel(/pause game/i).click();
    await page.waitForTimeout(300);
    check('desktop: pause overlay shown', (await page.getByRole('heading', { name: /^Paused$/i }).count()) === 1);

    const pausedScore = await page.getByTestId('score').textContent();
    await page.waitForTimeout(1200);
    const stillPausedScore = await page.getByTestId('score').textContent();
    check('desktop: no simulation while paused', pausedScore === stillPausedScore, `${pausedScore} vs ${stillPausedScore}`);

    // Role-name matching here is case-insensitive, so "RESUME" would also
    // match the HUD's "Resume game" icon button — scope to the dialog.
    const pauseDialog = page.getByRole('dialog');
    const dialogCount = await pauseDialog.count();
    check('desktop: pause dialog present', dialogCount === 1, `count=${dialogCount}`);
    if (dialogCount !== 1) {
      const dump = await page.evaluate(() => ({
        status: document.querySelector('.game-footer__status')?.textContent,
        overlays: Array.from(document.querySelectorAll('.overlay')).map((o) => o.className),
        buttons: Array.from(document.querySelectorAll('button')).map((b) => b.textContent.trim() || b.getAttribute('aria-label')),
        html: document.querySelector('.playfield')?.innerHTML.slice(0, 400),
      }));
      console.log('DEBUG pause state:', JSON.stringify(dump, null, 2));
    }
    await pauseDialog.getByRole('button', { name: /resume/i }).click({ timeout: 10000 });
    await page.waitForTimeout(300);
    check('desktop: resumed', (await page.getByRole('heading', { name: /^Paused$/i }).count()) === 0);

    // ---- Game over --------------------------------------------------------
    // Park the basket in the far-left corner and idle: nothing can be caught
    // there, so all five lives drain and the game-over overlay must appear.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowLeft');

    const gameOver = await page
      .waitForSelector('[data-testid="play-again"]', { timeout: 120000 })
      .then(() => true)
      .catch(() => false);
    check('desktop: game over reached after missing all eggs', gameOver);

    if (gameOver) {
      const finalScore = await page.getByTestId('final-score').textContent();
      const bestScore = await page.getByTestId('final-best').textContent();
      check('desktop: game over shows score', /^\d+$/.test(finalScore), finalScore);
      check('desktop: game over shows best score', /^\d+$/.test(bestScore), bestScore);

      const storedBest = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('catch-my-eggs:high-score') || '0'),
      );
      check('desktop: high score persisted', storedBest >= Number(finalScore), String(storedBest));

      // ---- Restart without refresh ----------------------------------------
      await page.getByTestId('play-again').click();
      await page.waitForTimeout(500);
      check('desktop: PLAY AGAIN restarts', (await page.getByTestId('play-again').count()) === 0);
      check('desktop: score reset on restart', (await page.getByTestId('score').textContent()) === '0');
      check(
        'desktop: lives reset on restart',
        (await page.getByLabel(/Lives remaining: 5 of 5/i).count()) === 1,
      );

      // ---- Main menu ------------------------------------------------------
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(1500);
      await page.keyboard.up('ArrowLeft');
      const overAgain = await page
        .waitForSelector('[data-testid="play-again"]', { timeout: 120000 })
        .then(() => true)
        .catch(() => false);
      if (overAgain) {
        await page.getByRole('button', { name: /MAIN MENU/i }).click();
        await page.waitForTimeout(500);
        check('desktop: MAIN MENU returns to start screen', (await page.getByTestId('start-button').count()) === 1);
      } else {
        check('desktop: game over reachable a second time', false);
      }
    }

    // ---- Console / network health ----------------------------------------
    check('desktop: no page errors', pageErrors.length === 0, pageErrors.join(' | '));
    check('desktop: no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    check('desktop: no failed requests', failedRequests.length === 0, failedRequests.join(' | '));

    await context.close();
  }

  // -------------------------------------------------------------- viewports --
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      deviceScaleFactor: vp.isMobile ? 2 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // No horizontal scrolling — a core responsive requirement.
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
    }));
    check(
      `${vp.name}: no horizontal overflow`,
      overflow.scrollW <= overflow.clientW + 1,
      `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`,
    );
    check(
      `${vp.name}: no vertical overflow`,
      overflow.scrollH <= overflow.clientH + 1,
      `scrollH=${overflow.scrollH} clientH=${overflow.clientH}`,
    );

    // Start and confirm the field + eggs render inside the viewport.
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(1500);

    const fieldBox = await page.locator('.playfield').boundingBox();
    check(
      `${vp.name}: playfield fits horizontally`,
      fieldBox.x >= -1 && fieldBox.x + fieldBox.width <= vp.width + 1,
      JSON.stringify(fieldBox),
    );

    // Touch controls must be usable where there is no keyboard.
    if (vp.hasTouch) {
      const btnVisible = await page.getByLabel(/move basket left/i).isVisible();
      check(`${vp.name}: on-screen controls visible`, btnVisible);

      if (btnVisible) {
        const before = await page.locator('.world__basket').boundingBox();
        const leftBtn = page.getByLabel(/move basket left/i);
        const box = await leftBtn.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(900);
        await page.mouse.up();
        await page.waitForTimeout(200);
        const after = await page.locator('.world__basket').boundingBox();
        check(
          `${vp.name}: on-screen button moves basket`,
          after.x < before.x - 5,
          `${before.x.toFixed(1)} -> ${after.x.toFixed(1)}`,
        );
      }
    }

    // Drag anywhere on the field should move the basket (touch devices).
    if (vp.hasTouch) {
      const field = await page.locator('.playfield').boundingBox();
      const before = await page.locator('.world__basket').boundingBox();
      const targetX = field.x + field.width * 0.8;
      await page.mouse.move(field.x + field.width * 0.2, field.y + field.height * 0.7);
      await page.mouse.down();
      await page.mouse.move(targetX, field.y + field.height * 0.7, { steps: 12 });
      await page.waitForTimeout(600);
      await page.mouse.up();
      await page.waitForTimeout(200);
      const after = await page.locator('.world__basket').boundingBox();
      check(
        `${vp.name}: drag moves basket toward target`,
        after.x > before.x + 5,
        `${before.x.toFixed(1)} -> ${after.x.toFixed(1)}`,
      );
    }

    check(`${vp.name}: no console errors`, errors.length === 0, errors.join(' | '));

    await context.close();
  }

  await browser.close();

  console.log('\n================ BROWSER CHECK RESULTS ================');
  results.forEach((r) => console.log(r));
  console.log('======================================================');
  console.log(`${results.length - failures}/${results.length} checks passed`);
  process.exit(failures > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error('Browser check crashed:', err);
  process.exit(2);
});
