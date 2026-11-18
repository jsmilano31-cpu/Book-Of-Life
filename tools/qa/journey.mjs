import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeReport } from './report.mjs';

const desktop = { width: 1440, height: 900 };
const handheld = { width: 390, height: 844 };

export async function journey({ browser, base, output }) {
  const reports = [];
  for (const [name, viewport, mobile, reduced] of [
    ['desktop', desktop, false, false],
    ['mobile', handheld, true, false],
    ['reduced-motion', { width: 1280, height: 720 }, false, true],
  ]) {
    console.log(`Testing ${name}`);
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      const failed = [];
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400)
          failed.push(`${response.status()} ${response.url()}`);
      });
      const capture = (stage) =>
        page.screenshot({ path: join(output, `${name}-${stage}.png`) });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('#hero-title').waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const video = page.locator('#atmosphere-video');
      if (reduced) {
        assert.ok(
          await video.evaluate(
            (el) => el.paused && getComputedStyle(el).display === 'none',
          ),
        );
      } else {
        await page.waitForFunction(
          () => document.querySelector('#atmosphere-video').currentTime > 0.1,
        );
        assert.equal(await video.evaluate((el) => el.error), null);
        await page.waitForFunction(() => {
          const canvas = document.querySelector('#atmosphere');
          const pixels = canvas
            .getContext('2d')
            .getImageData(0, canvas.height / 2, canvas.width, 1).data;
          return pixels.some((value, index) => index % 4 === 3 && value > 0);
        });
      }
      const shadow = await page
        .locator('.scene-cemetery .night-wash')
        .evaluate((el) => getComputedStyle(el, '::before').animationName);
      assert.equal(shadow, reduced ? 'none' : 'cemetery-shadow');
      await capture('opening');
      if (!reduced) {
        await page.locator('#sound-toggle').click();
        const motion = page.locator('#motion-toggle');
        await motion.click();
        assert.ok(await video.evaluate((el) => el.paused));
        assert.equal(
          await page
            .locator('.scene-cemetery .night-wash')
            .evaluate(
              (el) => getComputedStyle(el, '::before').animationPlayState,
            ),
          'paused',
        );
        await motion.click();
        await page.waitForFunction(
          () => !document.querySelector('#atmosphere-video').paused,
        );
        await page.keyboard.press('Escape');
      }

      const distance = await page
        .locator('#intro-runway')
        .evaluate((el) => el.offsetHeight - innerHeight);
      for (const [offset, progress] of [0.25, 0.45, 0.65, 0.91].entries()) {
        await page.evaluate(
          (top) => scrollTo({ top, behavior: 'instant' }),
          distance * progress,
        );
        await page
          .locator(
            `.journey-markers [data-scene="${offset + 1}"][aria-current="step"]`,
          )
          .waitFor();
      }
      assert.ok(
        await video.evaluate((el) => el.paused),
        'Video should pause beyond the cemetery',
      );
      await page.locator('#artifact-open').click();
      await page.waitForFunction(
        "window.experience?.mode === 'book' && window.experience.bookReady",
      );
      await page.waitForFunction(
        () =>
          document
            .querySelector('#storybook [data-page="2"]')
            ?.getAttribute('aria-hidden') === 'false',
      );
      assert.equal(
        await page.evaluate('window.experience.bookEngine'),
        'turnjs',
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const bounds = await page.locator('#book-stage').boundingBox();
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1,
        'Book outside viewport horizontally',
      );
      assert.ok(
        bounds.y >= 60 && bounds.y + bounds.height < viewport.height - 45,
        'Book outside viewport vertically',
      );
      await capture('book');

      await page.locator('#sound-toggle').click();
      const play = page.locator('#audio-play');
      await play.click();
      await page.getByRole('button', { name: 'Pause ambience' }).waitFor();
      await page.locator('#audio-mute').click();
      assert.equal(await page.locator('#audio-mute').innerText(), 'Unmute');
      await play.click();
      await page.getByRole('button', { name: 'Play ambience' }).waitFor();
      await page.keyboard.press('Escape');

      const waitForPage = (number) =>
        page.waitForFunction((pageNumber) => {
          const book = window.jQuery('#storybook');
          const page = document.querySelector(
            `#storybook [data-page="${pageNumber}"]`,
          );
          return (
            !book.turn('animating') &&
            page?.getAttribute('aria-hidden') === 'false'
          );
        }, number);
      const openChapter = async (index, textPage) => {
        await page.locator('#chapters-toggle').click();
        await page.locator(`[data-chapter-link="${index}"]`).click();
        await waitForPage(mobile ? textPage - 1 : textPage);
        if (mobile) {
          await page.locator('#next-page').click();
          await waitForPage(textPage);
        }
      };

      await openChapter(1, 5);
      await page.locator('#light-bridge').click();
      assert.equal(
        await page.locator('#light-bridge').getAttribute('aria-pressed'),
        'true',
      );
      assert.ok(
        await page
          .locator('#bridge-interaction')
          .evaluate((el) => el.classList.contains('active')),
      );
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction('window.experience.chapter === 2');

      await openChapter(4, 11);
      await capture('before-candles');
      for (let i = 0; i < 3; i++)
        await page.locator(`[data-candle="${i}"]`).click();
      assert.equal(await page.locator('.memory-candle.lit').count(), 3);
      await capture('candles');

      await openChapter(5, 13);
      await page.locator('[data-discovery="marigold"]').click();
      await page.locator('#detail-dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('#detail-dialog').waitFor({ state: 'hidden' });

      await openChapter(6, 15);
      assert.equal(await page.evaluate('window.experience.mode'), 'book');
      await page.locator('#begin-finale').click();
      await page.waitForFunction("window.experience.mode === 'finale'");
      await capture('finale');
      if (reduced) await page.locator('#credits-section').waitFor();
      else await page.locator('#skip-finale').click();
      await page.locator('#credits-section').waitFor();
      await page.locator('#credits-sources').click();
      await page.locator('dialog[open]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('#edit-credits').click();
      await page.locator('[name="team"]').fill('QA Test Team');
      await page.locator('[name="course"]').fill('Multimedia Design');
      await page.locator('#credits-form [type="submit"]').click();
      assert.match(
        await page.locator('#academic-credits').innerText(),
        /QA Test Team/,
      );
      await page.locator('#return-book').click();
      await page.waitForFunction(
        "window.experience.mode === 'book' && window.experience.chapter === 6",
      );
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('bol-project-credits')).team,
        ),
        'QA Test Team',
      );
      await page.locator('#skip-story').click();
      await page.waitForFunction("window.experience.mode === 'book'");
      await page.locator('#back-to-journey').click();
      await page.waitForFunction(
        "window.experience.mode === 'intro' && scrollY < 5",
      );

      assert.deepEqual(errors, [], 'JavaScript errors');
      assert.deepEqual(failed, [], 'Failed resources');
      reports.push({ context: name, status: 'passed', bookBounds: bounds });
    } finally {
      await context.close();
    }
  }
  await writeReport(output, 'journey-report.json', reports);
}
