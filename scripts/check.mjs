import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function walk(path) {const out=[];for (const e of await readdir(path,{withFileTypes:true})) {const p=path+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
let count=0;
for (const path of [...await walk('api'),...await walk('public')]) {
 if (path.endsWith('.js')) {const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status)throw Error(result.stderr);count++;}
 if(path.endsWith('.html')) {const text=await readFile(path,'utf8');for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!match[2].trim())continue;const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[2],encoding:'utf8'});if(result.status)throw Error(path+'\n'+result.stderr);count++;}}
}
console.log(`Syntax verified: ${count} JavaScript files and inline scripts.`);
