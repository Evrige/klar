import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLearning,applyAttempt,skillKey,intervals,validLearning,reviewQueue,acceptedAnswer,acceptedSpelling,answerFeedback} from '../src/learning/model.ts';
import {miniLessons,lessonCompleted} from '../src/learning/lessons.ts';
import {vocabulary} from '../src/data/vocabulary.ts';
import {experienceLevel} from '../src/learning/experience.ts';
import {eligibleAchievements,achievementsFor,validEarned} from '../src/data/achievements.ts';
import {verbs} from '../src/data/verbs.ts';
import {principalForms} from '../src/data/verbDetails.ts';
import {sentences,isCorrectSentence} from '../src/data/sentences.ts';
import {makeVerbTasks} from '../src/data/verbPractice.ts';
const now=Date.parse('2026-10-29T12:00:00Z');
const attempt={key:'word:recall:das Buch',domain:'word',wordId:'das Buch',mode:'recall',prompt:'das Buch',answers:['книга'],answer:'книга',correct:true,explanation:'das Buch — книга'};
test('Review skills stay independent; early repetitions cannot farm intervals',()=>{
 let state=applyAttempt(emptyLearning(),attempt,'1',now);const key=skillKey('das Buch','recall');assert.equal(state.skills[key].stage,1);assert.equal(state.skills[key].due,now+intervals[0]);
 state=applyAttempt(state,attempt,'2',now+1000);assert.equal(state.skills[key].stage,1);assert.equal(state.skills[key].due,now+intervals[0]);
 state=applyAttempt(state,attempt,'3',now+intervals[0]);assert.equal(state.skills[key].stage,2);assert.equal(state.skills[key].due,now+intervals[0]+intervals[1]);
 assert.equal(state.skills[skillKey('das Buch','spelling')],undefined);assert.equal(state.days.length,1);assert.ok(validLearning(JSON.parse(JSON.stringify(state))));
 const duplicate=applyAttempt(state,attempt,'3',now+intervals[1]);assert.equal(duplicate,state);
});
test('Mistakes need recovery after a day and wrong answers reset the schedule',()=>{
 let state=applyAttempt(emptyLearning(),{...attempt,correct:false,answer:'ручка'},'1',now);assert.equal(state.mistakes[attempt.key].resolved,false);assert.equal(state.skills[skillKey('das Buch','recall')].stage,0);
 state=applyAttempt(state,attempt,'2',now+1000);assert.equal(state.mistakes[attempt.key].resolved,false);
 state=applyAttempt(state,attempt,'3',now+2000);assert.equal(state.mistakes[attempt.key].resolved,false);
 state=applyAttempt(state,attempt,'4',now+intervals[1]);assert.equal(state.mistakes[attempt.key].resolved,true);
 state=applyAttempt(state,{...attempt,correct:false,answer:'ошибка'},'5',now+intervals[1]+1000);assert.equal(state.mistakes[attempt.key].recovery,0);assert.equal(state.mistakes[attempt.key].resolved,false);
});
test('Review queue prioritises overdue items, excludes future items and respects mode',()=>{
 const words=[{id:'a'},{id:'b'},{id:'c'}];const progress={'recall:a':{due:now-200},'recall:b':{due:now+200}};
 assert.deepEqual(reviewQueue(words,progress,'recall',now).map(w=>w.id),['a','c']);assert.deepEqual(reviewQueue(words,progress,'spelling',now).map(w=>w.id),['a','b','c']);
});
test('Authored lessons link real vocabulary, accept alternatives and require all steps',()=>{
 const ids=new Set(vocabulary.map(w=>w.id));assert.equal(miniLessons.length,8);assert.equal(new Set(miniLessons.map(l=>l.id)).size,8);
 for(const lesson of miniLessons){assert.ok(lesson.words.every(id=>ids.has(id)),lesson.id);assert.equal(lesson.tasks.length,3);assert.ok(!lessonCompleted(lesson,[]));assert.ok(!lessonCompleted(lesson,['dialogue','chunks','rule']));assert.ok(lessonCompleted(lesson,['dialogue','chunks','rule',...lesson.tasks.map(t=>t.id)]));
 for(const task of lesson.tasks){assert.ok(task.answers.length);assert.ok(task.answers.every(Boolean));if(task.kind==='listen')assert.ok(task.audio);assert.ok(task.prompt.ru&&task.prompt.uk&&task.explanation.ru&&task.explanation.uk);}}
 assert.ok(acceptedAnswer('In Berlin wohne ich!',['Ich wohne in Berlin.','In Berlin wohne ich.']));
 assert.equal(acceptedSpelling('das buch',['das Buch']),false);assert.equal(acceptedSpelling('Das Buch',['das Buch']),true);assert.match(answerFeedback('Bucher',['Bücher'],'word'),/ä/);
});
test('Malformed backups, unsupported versions and unsafe property names are rejected',()=>{
 assert.equal(validLearning(null),false);assert.equal(validLearning({...emptyLearning(),version:2}),false);assert.equal(validLearning({...emptyLearning(),skills:{a:{attempts:1,correct:5,stage:2,due:0,last:0}}}),false);
 assert.equal(validLearning({...emptyLearning(),skills:{'unknown:das Buch':{attempts:1,correct:1,stage:1,due:0,last:0}}}),false);
 assert.equal(validLearning({...emptyLearning(),days:['2026-99-99']}),false);
 assert.equal(validLearning(JSON.parse('{"version":1,"skills":{"__proto__":{}},"mistakes":{},"lessons":{},"processed":[],"days":[]}')),false);
 const state=applyAttempt(emptyLearning(),{...attempt,correct:false},'1',now);state.mistakes[attempt.key].audio={bad:true};assert.equal(validLearning(state),false);
});
test('Experience levels and streak awards continue beyond 30 without changing CEFR',()=>{
 assert.equal(experienceLevel(0).level,1);assert.equal(experienceLevel(99).level,1);assert.equal(experienceLevel(100).level,2);assert.equal(experienceLevel(400).level,3);
 const stats={lessons:0,known:0,testedWords:0,verbs:0,sentences:0,streak:50};const earned=eligibleAchievements(stats).map(a=>a.id);assert.ok(earned.includes('streak-40'));assert.ok(earned.includes('streak-50'));assert.ok(achievementsFor(stats).some(a=>a.id==='streak-60'));assert.ok(validEarned({'streak-40':new Date(now).toISOString()}));assert.equal(validEarned({'streak-41':new Date(now).toISOString()}),false);
});
test('Verb principal forms and price contexts stay meaningful',()=>{
 for(const v of verbs){const p=principalForms(v);assert.ok(p.past&&p.perfect,v.id);}
 assert.deepEqual(principalForms(verbs.find(v=>v.id==='arbeiten')),{past:'arbeitete',perfect:'hat gearbeitet'});
 assert.deepEqual(principalForms(verbs.find(v=>v.id==='verbessern')),{past:'verbesserte',perfect:'hat verbessert'});
 const prices=makeVerbTasks(verbs.find(v=>v.id==='kosten'),24);assert.ok(prices.every(t=>[2,5].includes(t.person)));assert.ok(!prices.some(t=>/^Ich /i.test(t.sentence)));
});
test('Generated statement practice accepts a verified time-first alternative',()=>{
 const entry=sentences.find(s=>s.german==='Ich lese heute ein Buch.');assert.ok(entry);assert.ok(isCorrectSentence(entry,['Heute','lese','ich','ein','Buch']));assert.equal(isCorrectSentence(entry,['Heute','ich','lese','ein','Buch']),false);
});
