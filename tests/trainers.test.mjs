import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nouns,isCorrectPlural,validNounProgress} from '../src/data/nouns.ts';
import {sentences,sentenceTokens,isCorrectSentence,validSentenceProgress,normalizeSentence} from '../src/data/sentences.ts';
import {makeDailyPlan,berlinDate,validDailyProgress,emptyDay} from '../src/data/dailyPlan.ts';
test('Nouns have distinct identifiers, an article and a complete plural paradigm',()=>{
 assert.equal(new Set(nouns.map(n=>n.id)).size,nouns.length);
 for(const noun of nouns){assert.ok(['der','die','das'].includes(noun.article));assert.ok(noun.plural&&noun.translation&&noun.tip);assert.ok(isCorrectPlural(noun,noun.plural));}
 assert.equal(isCorrectPlural(nouns.find(n=>n.id==='Buch'),'die Bücher'),true);
 assert.equal(isCorrectPlural(nouns.find(n=>n.id==='Buch'),'Bucher'),false);
 assert.equal(validNounProgress(['Buch:article','Buch:plural']),true);
 assert.equal(validNounProgress(['Buch:article','Buch:article']),false);
 assert.equal(validNounProgress(['unbekannt:article']),false);
});
test('Each sentence can be assembled from its bank; alternatives use the exact same words',()=>{
 assert.equal(new Set(sentences.map(s=>s.id)).size,sentences.length);
 for(const sentence of sentences){
  const tokens=sentenceTokens(sentence);
  assert.equal(new Set(tokens.map(t=>t.id)).size,tokens.length);
  assert.equal(isCorrectSentence(sentence,tokens.map(t=>t.text)),true,sentence.id);
  for(const alternative of sentence.alternatives??[]){assert.deepEqual(normalizeSentence(alternative).split(' ').sort(),normalizeSentence(sentence.german).split(' ').sort());assert.equal(isCorrectSentence(sentence,alternative.split(' ')),true);}
 }
 assert.equal(isCorrectSentence(sentences[0],['ich','heute','lerne','Deutsch']),false);
 assert.equal(validSentenceProgress(['learn']),true);
 assert.equal(validSentenceProgress(['learn','learn']),false);
});
test('Daily plans stay stable for a date and change on the following day',()=>{
 const plan=makeDailyPlan('2026-10-27');
 assert.deepEqual(plan,makeDailyPlan('2026-10-27'));
 assert.notDeepEqual(plan.words,makeDailyPlan('2026-10-28').words);
 assert.equal(plan.words.length,5);assert.equal(new Set(plan.words.map(w=>w.id)).size,5);
 assert.equal(plan.nouns.length,2);assert.ok(plan.topic&&plan.sentence);
 assert.equal(berlinDate(new Date('2026-10-27T23:30:00Z')),'2026-10-28');
 const day=emptyDay();day.ruleRead=true;day.words=[plan.words[0].id];
 assert.equal(validDailyProgress({'2026-10-27':day}),true);
 assert.equal(validDailyProgress({'2026-10-27':{...day,words:['missing']}}),false);
 assert.equal(validDailyProgress({'invalid':day}),false);
 assert.equal(validDailyProgress({'2026-10-27':{...day,ruleRead:'yes'}}),false);
});
