import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { startPreview } from './serve.mjs';
import { journey } from './qa/journey.mjs';
import { gate } from './qa/gate.mjs';
import { interactions } from './qa/interactions.mjs';
import { scroll } from './qa/scroll.mjs';

const output = await mkdtemp(join(tmpdir(), 'beyond-the-pages-qa-'));
console.log(`Browser reports and screenshots: ${output}`);
const server = await startPreview({ port: 0 });
const base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const suite of [journey, gate, interactions, scroll]) {
    console.log(`Running browser suite: ${suite.name}`);
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
    try {
      await suite({ browser, base, output });
      console.log(`Passed: ${suite.name}`);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
