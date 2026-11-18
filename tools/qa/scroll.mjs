import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeReport } from './report.mjs';

const entryPath = '/control/main.js';
const renderedScenes = [
  'scene-cemetery',
  'scene-friends',
  'scene-turning',
  'scene-world',
  'scene-awakening',
];

async function checkPreview(base) {
  const headers = { 'If-Modified-Since': 'Wed, 31 Dec 2036 23:59:59 GMT' };
  for (const path of ['/', entryPath, '/view/styles/site.css']) {
    const result = await fetch(base + path, { headers });
    assert.equal(result.status, 200, path);
    assert.match(result.headers.get('cache-control') ?? '', /no-store/);
    await result.arrayBuffer();
  }
  const result = await fetch(base + '/media/video/atmosphere.mp4', {
    headers: { Range: 'bytes=0-31' },
  });
  assert.equal(result.status, 206);
  assert.match(result.headers.get('content-range') ?? '', /^bytes 0-31\//);
  assert.equal((await result.arrayBuffer()).byteLength, 32);
}

async function swipeUp(page, session) {
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 195, y: 650 }],
  });
  await page.waitForTimeout(40);
  for (let move = 1; move <= 15; move++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 195, y: 650 - move * 32 }],
    });
    await page.waitForTimeout(25);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

export async function scroll({ browser, base, output }) {
  await checkPreview(base);
  const reports = [];
  for (const [name, viewport, mobile] of [
    ['desktop-wheel', { width: 1920, height: 1000 }, false],
    ['mobile-touch', { width: 390, height: 844 }, true],
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      const staleRequests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // A stale entry script expects a button removed from the current intro.
      await page.route(/\/(?:js|control)\/main\.js(?:\?.*)?$/, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === entryPath && url.search) return route.continue();
        staleRequests.push(url.pathname);
        return route.fulfill({
          contentType: 'text/javascript',
          body: "document.querySelector('#open-book').addEventListener('click', () => {});",
        });
      });

      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.experience?.mode === 'intro');
      assert.match(
        await page.locator('script[type="module"]').getAttribute('src'),
        /^control\/main\.js\?v=[0-9a-f]{12}$/,
      );
      assert.deepEqual(staleRequests, []);
      const observed = new Set();
      const session = mobile ? await context.newCDPSession(page) : null;
      await page.mouse.move(viewport.width * 0.7, viewport.height * 0.55);
      for (let step = 0; step < 13; step++) {
        if (step) {
          if (session) await swipeUp(page, session);
          else await page.mouse.wheel(0, 600);
          await page.waitForTimeout(750);
        }
        const visible = await page
          .locator('.cinematic-scene')
          .evaluateAll((scenes) =>
            scenes
              .filter((el) => {
                const css = getComputedStyle(el);
                return (
                  css.visibility === 'visible' && Number(css.opacity) > 0.75
                );
              })
              .map((el) => el.id),
          );
        visible.forEach((id) => observed.add(id));
        if (visible.includes('scene-awakening')) break;
      }
      assert.deepEqual([...observed].sort(), [...renderedScenes].sort(), name);
      await page.screenshot({
        path: join(output, `${name}-scroll-recovered.png`),
      });
      const artifact = page.locator('#artifact-open');
      if (mobile) await artifact.tap();
      else await artifact.click();
      await page.waitForFunction(
        "window.experience.mode === 'book' && window.experience.bookReady",
      );
      const initial = await page
        .locator('#storybook')
        .evaluate((el) => window.jQuery(el).turn('view'));
      await page.locator('#next-page').click();
      await page.waitForFunction(
        (pageNumber) =>
          Math.max(...window.jQuery('#storybook').turn('view')) > pageNumber,
        Math.max(...initial),
      );
      assert.deepEqual(errors, []);
      reports.push({
        context: name,
        scenes: [...observed],
        bookOpen: 'passed',
        pageTurn: 'passed',
      });
    } finally {
      await context.close();
    }
  }
  await writeReport(output, 'scroll-report.json', reports);
}
