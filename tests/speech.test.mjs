import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGermanVoice,germanVoices,waitForGermanVoices,nativeRecordings} from '../src/lib/speech.ts';
import {regularExamples} from '../src/data/rules.ts';
import {shuffle} from '../src/data/vocabularyPractice.ts';
const voice=(name,lang,uri=name)=>({name,lang,voiceURI:uri,default:false,localService:true});
test('Only German voices can be selected, even when a non-German URI was saved',()=>{
 const russian=voice('Russian','ru-RU'),english=voice('English','en-US'),german=voice('German','de-DE');
 assert.deepEqual(germanVoices([russian,english,german]),[german]);
 assert.equal(chooseGermanVoice([russian,english]),undefined);
 assert.equal(chooseGermanVoice([russian,english,german],russian.voiceURI),german);
});
test('Natural German voice is preferred to an ordinary voice; a user choice is respected',()=>{
 const basic=voice('German basic','de-DE'),natural=voice('German Natural','de-DE');
 assert.equal(chooseGermanVoice([basic,natural]),natural);
 assert.equal(chooseGermanVoice([basic,natural],basic.voiceURI),basic);
 assert.equal(chooseGermanVoice([voice('German underscore','de_DE')]).lang,'de_DE');
});
test('Wait for German voices instead of speaking with an unloaded default',async()=>{
 const synth=new EventTarget();let voices=[];
 synth.getVoices=()=>voices;
 const waiting=waitForGermanVoices(synth,100);
 const german=voice('German','de-DE');
 voices=[german];synth.dispatchEvent(new Event('voiceschanged'));
 assert.deepEqual(await waiting,[german]);
 const empty=new EventTarget();empty.getVoices=()=>[voice('English','en-US')];
 assert.deepEqual(await waitForGermanVoices(empty,1),[]);
});
test('Hallo is backed by an actual local Ogg recording and licensing information',()=>{
 const data=readFileSync('public'+nativeRecordings.hallo.url);
 assert.equal(data.subarray(0,4).toString(),'OggS');
 assert.ok(data.length>10000);
 assert.equal(nativeRecordings.hallo.author,'Jeuwre');
});
test('Automatic shuffle preserves all cards and does not mutate the stored dictionary',()=>{
 const cards=['first','second','third','fourth'];
 const mixed=shuffle(cards,()=>0);
 assert.notDeepEqual(mixed,cards);
 assert.deepEqual([...mixed].sort(),[...cards].sort());
 assert.deepEqual(cards,['first','second','third','fourth']);
});
test('The grammar builder has a translation for each verb and person',()=>{
 for(const verb of regularExamples){assert.equal(verb.translations.length,6);assert.ok(verb.translations.every(Boolean));}
 assert.equal(regularExamples.find(v=>v.infinitive==='lernen').translations[1],'ты учишься');
 assert.equal(regularExamples.find(v=>v.infinitive==='machen').translations[0],'я делаю');
});
