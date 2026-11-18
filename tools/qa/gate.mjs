import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeReport } from './report.mjs';

const gateLeaf = '.gate-left';
const transformOf = (el) => getComputedStyle(el).transform;

function checkBounds(before, after, message) {
  assert.ok(
    ['x', 'y', 'width', 'height'].every(
      (key) => Math.abs(before[key] - after[key]) < 1,
    ),
    message,
  );
}

export async function gate({ browser, base, output }) {
  const reports = [];
  for (const [name, viewport, reduced] of [
    ['desktop', { width: 1440, height: 900 }, false],
    ['mobile', { width: 390, height: 844 }, false],
    ['reduced', { width: 1280, height: 720 }, true],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      isMobile: name === 'mobile',
      hasTouch: name === 'mobile',
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      const leaf = page.locator(gateLeaf);
      const fixedPost = page.locator('.gate-post-left');
      assert.equal(
        await page.locator('#cemetery-gate').evaluate((el) => el.tagName),
        'DIV',
      );
      const images = page.locator('#cemetery-gate img');
      assert.equal(await images.count(), 4);
      assert.ok(
        await images.evaluateAll((all) =>
          all.every((image) => image.complete && image.naturalWidth > 0),
        ),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const closed = await leaf.evaluate(transformOf);
      const leafBefore = await leaf.boundingBox();
      const postBefore = await fixedPost.boundingBox();
      await page.screenshot({ path: join(output, `gate-${name}-closed.png`) });
      const length = await page
        .locator('#intro-runway')
        .evaluate((el) => el.offsetHeight - innerHeight);
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: 'instant' }),
        length * 0.14,
      );
      await page.waitForTimeout(1300);
      const opened = await leaf.evaluate(transformOf);
      checkBounds(
        postBefore,
        await fixedPost.boundingBox(),
        'Gate posts moved with the doors',
      );
      if (reduced)
        assert.equal(opened, closed, 'Reduced-motion gate should remain still');
      else
        assert.notEqual(
          opened,
          closed,
          'Image leaves did not open with scroll',
        );
      await page.screenshot({ path: join(output, `gate-${name}-opening.png`) });
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(1300);
      checkBounds(
        leafBefore,
        await leaf.boundingBox(),
        'Gate did not close on reverse scroll',
      );
      await page.locator('#skip-story').click();
      await page.waitForFunction(
        "window.experience.mode === 'book' && window.experience.bookReady",
      );
      assert.equal(
        await page.evaluate('window.experience.bookEngine'),
        'turnjs',
      );
      await page.locator('#back-to-journey').click();
      await page.waitForFunction("window.experience.mode === 'intro'");
      assert.deepEqual(errors, []);
      reports.push({ viewport: name, status: 'passed', closed, opened });
    } finally {
      await context.close();
    }
  }

  // The journey and reader must work even if the decorative gate image fails.
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/cemetery-gate-image.webp', (route) => route.abort());
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#skip-story').click();
  await page.waitForFunction("window.experience.mode === 'book'");
  assert.deepEqual(errors, []);
  await page.close();
  reports.push({ gateImageFailure: 'book remains accessible' });
  await writeReport(output, 'gate-report.json', reports);
}
