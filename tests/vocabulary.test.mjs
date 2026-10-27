import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vocabulary, categories, isVocabularyProgress, markWord } from '../src/data/vocabulary.ts';
import { makeWordSession } from '../src/data/vocabularyPractice.ts';
import { ruleTopics } from '../src/data/rules.ts';

test('The starter dictionary contains exactly 1000 distinct complete cards',()=>{
 assert.equal(vocabulary.length,1000);
 assert.equal(new Set(vocabulary.map(w=>w.id)).size,1000);
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
test('Review sessions preserve the chosen pool and provide one correct answer per question',()=>{
 const pool=vocabulary.slice(50,75);
 const session=makeWordSession(pool,20,()=>.4);
 assert.equal(session.length,20);
 assert.equal(new Set(session.map(q=>q.word.id)).size,20);
 for(const q of session){
  assert.ok(pool.some(w=>w.id===q.word.id));
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.options).size,4);
  assert.equal(q.options.filter(o=>o===q.word.translation).length,1);
 }
 assert.equal(makeWordSession([],20).length,0);
 assert.equal(makeWordSession([pool[0]],20).length,1);
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
