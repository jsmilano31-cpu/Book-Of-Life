import {readFile, readdir, stat} from 'node:fs/promises';
import {join, dirname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const dist=join(root,'dist');
let failures=[];
async function files(directory){let result=[];for(const item of await readdir(directory,{withFileTypes:true})){const p=join(directory,item.name);result.push(...item.isDirectory()?await files(p):[p]);}return result;}
const all=await files(dist);
for(const file of all.filter(p=>p.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)failures.push(result.stderr);}
for(const file of all.filter(p=>/\.(html|css|js)$/.test(p)&&!p.includes(`${join('assets','vendor')}`))){
  const text=await readFile(file,'utf8');
  const candidates=[...text.matchAll(/(?:src|href)=["']([^"'#]+)["']|url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]||m[2]);
  for(const candidate of candidates){
    if(/^(https?:|data:|mailto:|\$\{|\/\/)/.test(candidate)||candidate.includes('${'))continue;
    if(!/\.(?:js|css|ttf|woff2?|webp|mp4|svg|json)(?:\?|$)/.test(candidate))continue;
    const target=resolve(dirname(file),candidate.split('?')[0]);
    try{await stat(target);}catch{failures.push(`Missing asset: ${candidate} referenced by ${file}`);}
  }
}
const {chapters,createPages}=await import('../dist/js/content.js');
if(chapters.length!==7)failures.push('Expected seven chapters');
if((createPages().match(/data-page="/g)||[]).length!==16)failures.push('Expected fourteen interior pages plus two covers');
for(const chapter of chapters){try{await stat(join(dist,'assets','images',chapter.image));}catch{failures.push(`Missing chapter image ${chapter.image}`);}}
const manifest=JSON.parse(await readFile(join(root,'.openai','hosting.json'),'utf8'));
if(!manifest.project_id||manifest.static?.directory!=='dist')failures.push('Invalid hosting manifest');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
let size=0;for(const file of all)size+=(await stat(file)).size;
console.log(`PASS: JavaScript syntax, local asset links, 7 chapters / 16 pages, hosting manifest. ${all.length} static files, ${(size/1024/1024).toFixed(2)} MiB total.`);
