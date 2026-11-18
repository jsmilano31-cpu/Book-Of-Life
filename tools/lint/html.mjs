import { readFile } from 'node:fs/promises';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { createPages } from '../../dist/js/views/book-pages.js';

const validator = new HtmlValidate({
  elements: ['html5'],
  rules: {
    'close-order': 'error',
    'element-permitted-content': 'error',
    'element-required-attributes': 'error',
    'input-missing-label': 'error',
    'no-dup-attr': 'error',
    'no-dup-id': 'error',
    'no-missing-references': 'error',
    'valid-id': 'error',
    'void-content': 'error',
  },
});

const path = 'dist/index.html';
const html = await readFile(path, 'utf8');
const mount = /(<div id="storybook"[^>]*>)(\s*<\/div>)/;
if (!mount.test(html)) throw new Error('Expected an empty storybook mount');

const report = await validator.validateString(
  html.replace(mount, (_match, open, close) => open + createPages() + close),
  path,
);
if (!report.valid) {
  console.error(formatterFactory('stylish')(report.results));
  process.exitCode = 1;
}
