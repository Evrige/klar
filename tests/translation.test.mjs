import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sentences} from '../src/data/sentences.ts';
import {makeSentenceSession} from '../src/lib/sentenceSessions.ts';
import {translateRussian,findLocalTranslation,decodeTranslation} from '../src/lib/translate.ts';
test('The expanded library contains over 1500 unique real sentence tasks and preserves original progress IDs',()=>{
 assert.ok(sentences.length>1500);
 assert.equal(new Set(sentences.map(s=>s.id)).size,sentences.length);
 assert.equal(new Set(sentences.map(s=>s.german.toLowerCase())).size,sentences.length);
 for(const id of ['learn','perfect','dative','not'])assert.ok(sentences.some(s=>s.id===id),id);
 assert.ok(sentences.some(s=>s.german==='Ihr esst heute einen Apfel.'));
 assert.ok(sentences.some(s=>s.german==='Du liest jeden Tag ein Buch.'));
 assert.ok(sentences.some(s=>s.german==='Ich habe gestern Fußball gespielt.'));
});
test('Sessions prioritise unmastered sentences and remain unique',()=>{
 const pool=sentences.slice(0,30),known=pool.slice(0,20).map(s=>s.id);
 const session=makeSentenceSession(pool,known,10,()=>.5);
 assert.equal(session.length,10);assert.ok(session.every(s=>!known.includes(s.id)));
 assert.equal(new Set(session.map(s=>s.id)).size,10);
});
test('The user football example works offline, with the full translation and a grammar explanation',async()=>{
 const result=await translateRussian('Я вчера играл в футбол с друзьями',{fetcher:()=>{throw new Error('Network must not be used');}});
 assert.equal(result.source,'library');
 assert.equal(result.german,'Ich habe gestern mit Freunden Fußball gespielt.');
 assert.match(result.explanation,/Perfekt/);
 assert.ok(findLocalTranslation('  я ВЧЕРА играл в футбол с друзьями! '));
});
test('Arbitrary Russian text is sent only to the specified German translation API',async()=>{
 let called=false;
 const result=await translateRussian('Я хочу заказать столик на двоих.',{fetcher:async(url,options)=>{
  called=true;const request=new URL(url);assert.equal(request.hostname,'api.mymemory.translated.net');assert.equal(request.searchParams.get('langpair'),'ru|de');assert.equal(request.searchParams.get('q'),'Я хочу заказать столик на двоих.');assert.equal(options.credentials,'omit');
  return new Response(JSON.stringify({responseStatus:200,responseData:{translatedText:'Ich möchte einen Tisch für zwei Personen reservieren.'}}));
 }});
 assert.ok(called);assert.equal(result.source,'online');assert.match(result.german,/reservieren/);
});
test('Quota, malformed responses, network failures and oversized UTF-8 input are reported honestly',async()=>{
 const phrase='Я хочу поехать в маленькую деревню завтра утром.';
 await assert.rejects(translateRussian(phrase,{fetcher:async()=>new Response('{}',{status:429})}),/лимит/i);
 await assert.rejects(translateRussian(phrase,{fetcher:async()=>new Response(JSON.stringify({responseStatus:200,quotaFinished:true,responseData:{translatedText:'WARNING'}}))}),/лимит/i);
 await assert.rejects(translateRussian(phrase,{fetcher:async()=>new Response('{}')}),/не вернул/i);
 await assert.rejects(translateRussian(phrase,{fetcher:async()=>{throw new TypeError('Failed to fetch');}}),/Нет связи/);
 await assert.rejects(translateRussian('я'.repeat(251)),/слишком длинная/);
 await assert.rejects(()=>translateRussian(''),/Напишите/);
 assert.equal(decodeTranslation('Gr&uuml;ß &amp; &#xDF; &#39;test&#39;'),'Grüß & ß \'test\'');
});
