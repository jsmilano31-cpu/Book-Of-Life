import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const entry=await readFile(join(root,'dist','js','main.js'));
const version=createHash('sha256').update(entry).digest('hex').slice(0,12);
const indexPath=join(root,'dist','index.html');
const html=await readFile(indexPath,'utf8');
const pattern=/src="js\/main\.js(?:\?v=[^"]*)?"/g;
if([...html.matchAll(pattern)].length!==1)throw new Error('Expected one main module entry in index.html.');
const updated=html.replace(pattern,`src="js/main.js?v=${version}"`);
if(updated!==html)await writeFile(indexPath,updated,'utf8');
console.log(`Entry script version: ${version}`);
const check=spawnSync(process.execPath,[join(root,'tools','check.mjs')],{cwd:root,stdio:'inherit'});
if(check.error)throw check.error;
process.exitCode=check.status??1;
