import fs from 'node:fs';
import {vocabulary} from '../src/data/vocabulary.ts';
const levels=['A1','A2','B1'];const sets={};
const normalize=s=>s.toLocaleLowerCase('de-DE').normalize('NFC').replace(/^(der|die|das)\s+/,'').trim();
for(const level of levels){const set=new Set();for(const line of fs.readFileSync(`.reference-cache/${level}.txt`,'utf8').split('\n')){for(const field of line.trim().split(/\s{2,}|\t+/)){
 const s=field.trim();let head;
 if(/^(?:der|die|das)\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+(?:[,.\s]|$)/.test(s))head=s.match(/^(?:der|die|das)\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/)?.[1];
 else if(/^[a-zäöüß][a-zäöüß-]*(?:,|$)/.test(s))head=s.match(/^([a-zäöüß][a-zäöüß-]*)/)?.[1];
 if(head)set.add(normalize(head));
 }}sets[level]=set;}
const metadata={};for(const w of vocabulary){const word=normalize(w.word);const match=levels.find(l=>sets[l].has(word));if(match)metadata[w.id]=match;}
console.log(JSON.stringify({headwords:Object.fromEntries(levels.map(l=>[l,sets[l].size])),matched:Object.keys(metadata).length,levels:Object.values(metadata).reduce((a,l)=>(a[l]=(a[l]||0)+1,a),{}),unknown:vocabulary.filter(w=>!metadata[w.id]).map(w=>w.id)}));
fs.writeFileSync('src/data/vocabularyLevels.json',JSON.stringify(metadata,null,2)+'\n');
