import test from 'node:test';
import assert from 'node:assert/strict';
import {vocabulary,isVocabularyProgress} from '../src/data/vocabulary.ts';
import {wordLevels,wordLevel,validSelectedLevels} from '../src/data/wordLevels.ts';
import {verbs,splitForm} from '../src/data/verbs.ts';
import {makeVerbTasks,solvedVerbSentence} from '../src/data/verbPractice.ts';
import {sentences} from '../src/data/sentences.ts';
import {sentenceGlosses} from '../src/data/sentenceGlossary.ts';
test('Word level selection partitions every existing card and preserves its saved ID',()=>{
 const groups=wordLevels.map(level=>vocabulary.filter(w=>wordLevel(w.id)===level));
 assert.equal(groups.flat().length,2000);assert.equal(new Set(groups.flat().map(w=>w.id)).size,2000);
 for(const group of groups)assert.ok(group.length>0);
 assert.equal(wordLevel('du'),'A1');assert.equal(wordLevel('guten Morgen'),'A1');
 assert.ok(validSelectedLevels(['A1','B1']));assert.ok(validSelectedLevels([]));assert.equal(validSelectedLevels(['A1','A1']),false);assert.equal(validSelectedLevels(['C2']),false);
 assert.ok(isVocabularyProgress({[vocabulary[0].id]:'known'}));
});
test('Expanded verbs have correct irregular, inserted-e and -ern present forms',()=>{
 assert.equal(verbs.length,71);for(const l of ['A1','A2','B1'])assert.ok(verbs.filter(v=>v.level===l).length>=15);
 const expected={helfen:'helfe,hilfst,hilft,helfen,helft,helfen',geben:'gebe,gibst,gibt,geben,gebt,geben',halten:'halte,hältst,hält,halten,haltet,halten',empfehlen:'empfehle,empfiehlst,empfiehlt,empfehlen,empfehlt,empfehlen',vergessen:'vergesse,vergisst,vergisst,vergessen,vergesst,vergessen',öffnen:'öffne,öffnest,öffnet,öffnen,öffnet,öffnen',verbessern:'verbessere,verbesserst,verbessert,verbessern,verbessert,verbessern'};
 for(const [id,forms]of Object.entries(expected))assert.equal(verbs.find(v=>v.id===id).forms.join(','),forms);
 for(const id of ['finden','antworten','warten','öffnen'])assert.deepEqual(splitForm(verbs.find(v=>v.id===id),1),{stem:verbs.find(v=>v.id===id).stem,ending:'est',changed:false});
 assert.equal(splitForm(verbs.find(v=>v.id==='verbessern'),3).ending,'n');
});
test('Each verb provides 24 distinct tasks across four kinds and extended sessions preserve answer IDs',()=>{
 for(const verb of verbs){const tasks=makeVerbTasks(verb,24,()=>.42);assert.equal(tasks.length,24);assert.equal(new Set(tasks.map(t=>t.key)).size,24);assert.equal(new Set(tasks.map(t=>t.kind)).size,4);assert.equal(new Set(tasks.map(t=>t.person)).size,verb.id==='kosten'?2:6);
  for(const task of tasks){assert.equal(task.answer,verb.forms[task.person]);assert.ok(!solvedVerbSentence(task).includes('___'));if(task.kind==='correction')assert.notEqual(task.wrong,task.answer);}
  for(const count of [12,36])assert.equal(makeVerbTasks(verb,count).length,count);
 }
});
test('Every word of the built-in sentence library has a gloss, including articles and auxiliaries',()=>{
 for(const sentence of sentences){const glosses=sentenceGlosses(sentence.german);assert.ok(glosses.every(g=>g.known),sentence.id);assert.ok(glosses.every(g=>g.translation.length>0));}
 const perfect=sentenceGlosses('Ich habe gestern Deutsch gelernt.');assert.match(perfect.find(g=>g.word==='habe').translation,/вспомогательный/);
 const possess=sentenceGlosses('Ich habe kein Auto.');assert.doesNotMatch(possess.find(g=>g.word==='habe').translation,/вспомогательный/);
 const separable=sentenceGlosses('Ich stehe um sieben Uhr auf.');assert.match(separable.at(-1).note,/aufstehen/);
 assert.match(sentenceGlosses('Ihr lernt Deutsch.').find(g=>g.word==='lernt').translation,/учите/);
 assert.equal(sentenceGlosses('Unbekannteswort.')[0].known,false);
 assert.match(sentenceGlosses('Das ist nicht teuer.')[0].note,/местоимение/);
 assert.match(sentenceGlosses('Das Buch liegt auf dem Tisch.')[0].translation,/артикль/);
 assert.equal(sentenceGlosses('Ich lerne heute Deutsch.','uk')[0].translation,'я');
});
