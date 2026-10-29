import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root=process.cwd();
const extensions=['','.ts','.tsx','.json','.css','/index.ts','/index.tsx'];
const sources=[];
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const filename=path.join(dir,entry.name);
    if(entry.isDirectory())walk(filename);
    else if(/\.[cm]?[jt]sx?$/.test(entry.name))sources.push(filename);
  }
}
function exactCase(filename) {
  const relative=path.relative(root,filename);
  let current=root;
  for(const part of relative.split(path.sep)) {
    if(!fs.existsSync(current)||!fs.readdirSync(current).includes(part))return false;
    current=path.join(current,part);
  }
  return fs.existsSync(current)&&fs.statSync(current).isFile();
}
walk(path.join(root,'src'));
const errors=[];
for(const filename of sources) {
  const info=ts.preProcessFile(fs.readFileSync(filename,'utf8'),true,true);
  for(const item of info.importedFiles.filter(i=>i.fileName.startsWith('.'))) {
    const target=path.resolve(path.dirname(filename),item.fileName);
    if(!extensions.some(ext=>exactCase(target+ext)))errors.push(`${path.relative(root,filename)} → ${item.fileName}`);
  }
}
if(errors.length) {
  console.error('Missing local imports or incorrect filename case:\n'+errors.join('\n'));
  process.exit(1);
}
console.log(`Local imports and filename case checked (${sources.length} source files).`);
