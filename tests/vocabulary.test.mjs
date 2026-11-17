import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vocabulary, categories, isVocabularyProgress, markWord } from '../src/data/vocabulary.ts';
import { advanceWordSession, makeWordSession } from '../src/data/vocabularyPractice.ts';
import { ruleTopics } from '../src/data/rules.ts';

test('The starter dictionary contains exactly 5113 distinct complete cards',()=>{
 assert.equal(vocabulary.length,5113);
 assert.equal(new Set(vocabulary.map(w=>w.id)).size,5113);
 for(const word of vocabulary){
  for(const key of ['id','word','translation','reading','category'])assert.ok(typeof word[key]==='string'&&word[key].trim(),`${word.id}: ${key}`);
  assert.match(word.translation,/[а-яё]/i);
  assert.match(word.reading,/[а-яё]/i);
  assert.ok(categories.includes(word.category));
 }
});
test('A known word can be moved back into learning without losing other words',()=>{
 const [first,second]=vocabulary;
 let progress=markWord({},first.id,'known');
 progress=markWord(progress,second.id,'learning');
 progress=markWord(progress,first.id,'learning');
 assert.deepEqual(progress,{[first.id]:'learning',[second.id]:'learning'});
 assert.equal(isVocabularyProgress(JSON.parse(JSON.stringify(progress))),true);
 assert.equal(isVocabularyProgress({[first.id]:'bogus'}),false);
 assert.equal(isVocabularyProgress({'unknown-word':'known'}),false);
 assert.equal(isVocabularyProgress(null),false);
 assert.equal(isVocabularyProgress([]),false);
 assert.equal(markWord(progress,'unknown-word','known'),progress);
});
test('Vocabulary practice picks up to 20 unique cards from the filtered pool',()=>{
 const pool=vocabulary.slice(50,75);
 const session=makeWordSession(pool,20,()=>.4);
 assert.equal(session.length,20);
 assert.equal(new Set(session.map(w=>w.id)).size,20);
 assert.ok(session.every(w=>pool.includes(w)));
 assert.deepEqual(makeWordSession([]),[]);
 assert.deepEqual(makeWordSession([pool[0]]),[pool[0]]);
});
test('Unknown words wait for the next round and known words leave the session',()=>{
 const pool=vocabulary.slice(50,53);
 let session={pending:pool,retries:[],total:pool.length};
 session=advanceWordSession(session,'learning');
 assert.deepEqual(session.pending,[pool[1],pool[2]]);
 assert.equal(session.retries[0].word,pool[0]);
 session=advanceWordSession(session,'known');
 session=advanceWordSession(session,'known');
 assert.deepEqual(session.pending,[pool[0]]);
 assert.deepEqual(session.retries,[]);
 assert.deepEqual(advanceWordSession(session,'learning').pending,[pool[0]]);
 assert.deepEqual(advanceWordSession(session,'known').pending,[]);
});
test('The next round changes order and keeps recently shown words out of its first slots',()=>{
 const pool=vocabulary.slice(50,70);
 let session={pending:pool,retries:[],total:pool.length};
 for(const word of pool){
  const known=pool.indexOf(word)%2===0&&word!==pool[18];
  session=advanceWordSession(session,known?'known':'learning',()=>.99);
 }
 assert.equal(session.pending.length,11);
 assert.equal(new Set(session.pending).size,11);
 assert.notEqual(session.pending[0],pool[17]);
 assert.notEqual(session.pending[0],pool[19]);
 assert.notDeepEqual(session.pending,pool.filter((_,i)=>i%2===1||i===18));
 session.pending.forEach((word,index)=>{
  assert.ok(19-pool.indexOf(word)+index>=3);
 });
});
test('Grammar tables keep a complete cell for every column',()=>{
 assert.equal(new Set(ruleTopics.map(t=>t.id)).size,ruleTopics.length);
 for(const topic of ruleTopics)for(const table of topic.tables)for(const row of table.rows){
  assert.equal(row.length,table.columns.length,table.title);
  assert.ok(row.every(c=>c.trim().length));
 }
 const regular=ruleTopics[0].tables[0];
 assert.equal(regular.rows.length,6);
 assert.ok(regular.rows[0].includes('-en → -e'));
});
