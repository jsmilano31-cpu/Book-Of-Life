import assert from 'node:assert/strict';
import { writeReport } from './report.mjs';

const desktop = { width: 1366, height: 820 };
const handheld = { width: 390, height: 844 };
const bookReady =
  "window.experience.mode === 'book' && window.experience.bookReady";

export async function interactions({ browser, base, output }) {
  const desktopPage = await browser.newPage({ viewport: desktop });
  const errors = [];
  desktopPage.on('pageerror', (error) => errors.push(error.message));
  await desktopPage.goto(base, { waitUntil: 'networkidle' });
  await desktopPage.locator('#skip-story').click();
  await desktopPage.waitForFunction(bookReady);
  await desktopPage.waitForTimeout(900);
  // Drag the bottom-right corner of the real Turn.js book.
  const bounds = await desktopPage.locator('#storybook').boundingBox();
  const x = bounds.x + bounds.width - 3;
  const y = bounds.y + bounds.height - 3;
  await desktopPage.mouse.move(x, y);
  await desktopPage.mouse.down();
  await desktopPage.mouse.move(bounds.x + bounds.width * 0.18, y - 45, {
    steps: 35,
  });
  await desktopPage.mouse.up();
  await desktopPage.waitForFunction('window.experience.chapter === 1');

  // Reflow the same initialized book before testing reduced motion.
  await desktopPage.setViewportSize(handheld);
  await desktopPage.waitForFunction(() => {
    const book = document.querySelector('#storybook');
    return (
      document.querySelector('#book-stage').classList.contains('single-page') &&
      window.jQuery(book).turn('display') === 'single'
    );
  });
  await desktopPage.setViewportSize(desktop);
  await desktopPage.waitForFunction(
    () => window.jQuery('#storybook').turn('display') === 'double',
  );
  await desktopPage.emulateMedia({ reducedMotion: 'reduce' });
  await desktopPage.waitForFunction(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  await desktopPage.locator('#next-page').click();
  await desktopPage.waitForFunction('window.experience.chapter === 2');
  assert.deepEqual(errors, []);
  await desktopPage.close();

  const mobile = await browser.newContext({
    viewport: handheld,
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await mobile.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#skip-story').tap();
    await page.waitForFunction(bookReady);
    await page.waitForTimeout(900);
    const session = await mobile.newCDPSession(page);
    const book = await page.locator('#storybook').boundingBox();
    const x = book.x + book.width * 0.85;
    const y = book.y + book.height * 0.6;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 12; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - (210 * step) / 12, y }],
      });
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await page.waitForFunction(
      () => window.jQuery('#storybook').turn('page') >= 3,
    );
  } finally {
    await mobile.close();
  }

  // Missing libraries and blocked video should leave the story and controls usable.
  const fallback = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const fallbackErrors = [];
  fallback.on('pageerror', (error) => fallbackErrors.push(error.message));
  for (const path of [
    'vendor/turn.js',
    'vendor/gsap.min.js',
    'vendor/ScrollTrigger.min.js',
    'media/video/atmosphere.mp4',
  ]) {
    await fallback.route(`**/${path}`, (route) => route.abort());
  }
  const failedVideo = fallback.waitForEvent('requestfailed', {
    predicate: (request) =>
      request.url().endsWith('/media/video/atmosphere.mp4'),
  });
  await fallback.goto(base, { waitUntil: 'networkidle' });
  await failedVideo;
  const posterUrl = await fallback
    .locator('#atmosphere-video')
    .evaluate((video) => video.poster);
  const poster = await fallback.request.get(posterUrl);
  assert.ok(poster.ok(), 'The video fallback poster should remain available');
  await fallback.locator('#skip-story').click();
  await fallback.waitForFunction(bookReady);
  assert.equal(
    await fallback.evaluate('window.experience.bookEngine'),
    'fallback',
  );
  await fallback.locator('#next-page').click();
  await fallback.waitForFunction('window.experience.chapter === 1');
  await fallback.locator('#light-bridge').click();
  assert.equal(
    await fallback.locator('#light-bridge').getAttribute('aria-pressed'),
    'true',
  );
  await fallback.locator('#back-to-journey').click();
  await fallback.waitForFunction("window.experience.mode === 'intro'");
  assert.deepEqual(fallbackErrors, []);
  await fallback.close();

  await writeReport(output, 'interaction-report.json', {
    status: 'passed',
    checks: [
      'Turn.js drag',
      'Live viewport resize',
      'Runtime reduced motion',
      'Touch swipe',
      'Missing libraries and video fallback',
    ],
  });
}
