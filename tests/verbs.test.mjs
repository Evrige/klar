import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verbs,splitForm} from '../src/data/verbs.ts';
test('All verbs have six complete forms and unique identifiers',()=>{
 assert.equal(new Set(verbs.map(v=>v.id)).size,verbs.length);
 for(const v of verbs){assert.equal(v.forms.length,6,v.id);assert.equal(v.translations.length,6,v.id);assert.ok(v.forms.every(Boolean));for(let i=0;i<6;i++){const s=splitForm(v,i);assert.equal(s.stem+s.ending,v.forms[i]);}}
});
test('Irregular and modal forms match the reference paradigm',()=>{
 const expected={sein:'bin,bist,ist,sind,seid,sind',haben:'habe,hast,hat,haben,habt,haben',werden:'werde,wirst,wird,werden,werdet,werden',können:'kann,kannst,kann,können,könnt,können',müssen:'muss,musst,muss,müssen,müsst,müssen',wollen:'will,willst,will,wollen,wollt,wollen',dürfen:'darf,darfst,darf,dürfen,dürft,dürfen',sollen:'soll,sollst,soll,sollen,sollt,sollen',mögen:'mag,magst,mag,mögen,mögt,mögen'};
 for(const [id,forms]of Object.entries(expected))assert.equal(verbs.find(v=>v.id===id).forms.join(','),forms);
});
test('Stem changes and irregular present endings are visible',()=>{
 for(const id of ['sprechen','fahren','nehmen','essen','lesen'])assert.equal(splitForm(verbs.find(v=>v.id===id),1).changed,true,id);
 assert.equal(splitForm(verbs.find(v=>v.id==='heißen'),1).ending,'t');
 assert.equal(verbs.find(v=>v.id==='arbeiten').forms[1],'arbeitest');
 assert.equal(splitForm(verbs.find(v=>v.id==='arbeiten'),1).changed,false);
 assert.equal(splitForm(verbs.find(v=>v.id==='arbeiten'),1).ending,'est');
 assert.equal(splitForm(verbs.find(v=>v.id==='werden'),4).changed,false);
});
