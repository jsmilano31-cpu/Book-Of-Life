import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = join(root, 'dist');
const folders = ['control', 'model', 'view'];
const modules = (
  await Promise.all(
    folders.map(async (folder) => {
      const names = await readdir(join(moduleRoot, folder), {
        recursive: true,
      });
      return names
        .filter((name) => name.endsWith('.js'))
        .map((name) => join(folder, name));
    }),
  )
)
  .flat()
  .sort();
const hash = createHash('sha256');
for (const file of modules) {
  hash.update(file.replaceAll('\\', '/')).update('\0');
  hash.update(await readFile(join(moduleRoot, file))).update('\0');
}
const version = hash.digest('hex').slice(0, 12);
const indexPath = join(root, 'dist', 'index.html');
const html = await readFile(indexPath, 'utf8');
const pattern = /src="control\/main\.js(?:\?v=[^"]*)?"/g;
if ([...html.matchAll(pattern)].length !== 1)
  throw new Error('Expected one main module entry in index.html.');
const updated = html.replace(pattern, `src="control/main.js?v=${version}"`);
if (updated !== html) await writeFile(indexPath, updated, 'utf8');
console.log(`Entry script version: ${version}`);
const check = spawnSync(process.execPath, [join(root, 'tools', 'check.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if (check.error) throw check.error;
process.exitCode = check.status ?? 1;
