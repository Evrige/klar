import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAttempt,completeLessonStep,emptyLearning,intervals,validLearning} from '../src/learning/model.ts';
import {weekDates,weeklyReport} from '../src/learning/weekly.ts';
import {diagnose} from '../src/learning/diagnostics.ts';
const now=Date.parse('2026-10-29T12:00:00Z');
const attempt={key:'word:spelling:das Buch',domain:'word',wordId:'das Buch',mode:'spelling',prompt:'книга',answers:['das Buch'],answer:'das Buch',correct:true,explanation:'книга'};

test('Weekly dates use Berlin calendar days across DST and midnight',()=>{
 assert.deepEqual(weekDates(Date.parse('2026-10-25T23:30:00Z')).slice(-2),['2026-10-25','2026-10-26']);
 assert.equal(weekDates(now)[0],'2026-10-23');
 assert.equal(new Set(weekDates(Date.parse('2026-03-29T22:30:00Z'))).size,7);
});
test('Weekly results record real attempts, unique words, mastery transitions and event deduplication',()=>{
 let state=applyAttempt(emptyLearning(),attempt,'a',now-2*86400_000);
 state=applyAttempt(state,attempt,'b',now-86400_000);
 state=applyAttempt(state,attempt,'c',now);
 const dup=applyAttempt(state,attempt,'c',now);assert.equal(dup,state);
 const r=weeklyReport(state,now);assert.equal(r.attempts,3);assert.equal(r.correct,3);assert.equal(r.words,1);assert.equal(r.skills,1);assert.equal(r.accuracy,100);assert.equal(r.activeDays,3);
 state=applyAttempt(state,{...attempt,correct:false},'d',now+1);assert.equal(weeklyReport(state,now+1).accuracy,75);assert.equal(weeklyReport(state,now+1).weak[0][0],'word');
 assert.ok(validLearning(JSON.parse(JSON.stringify(state))));
});
test('Old backups remain valid; past attempt dates and percentages are not invented',()=>{
 const old={...emptyLearning(),days:['2026-10-28']};assert.ok(validLearning(old));const r=weeklyReport(old,now);assert.equal(r.activeDays,1);assert.equal(r.attempts,0);assert.equal(r.accuracy,null);assert.equal(r.comparison,null);
 const combined=weeklyReport(old,now,['2026-10-28','2026-10-29']);assert.equal(combined.activeDays,2);assert.equal(combined.attempts,0); // Video activity is not fabricated as checked answers.
 let s=applyAttempt(old,attempt,'a',now);s.journal.days['2026-10-29'].correct=2;assert.equal(validLearning(s),false);
 assert.equal(validLearning({...old,journal:{started:'bad',days:{}}}),false);
 assert.equal(validLearning({...old,journal:{started:'2026-10-29',days:{'2026-10-28':{attempts:0,correct:0,words:[],skills:[],resolved:[],lessons:[]}}}}),false);
});
test('Lesson completion and resolved mistakes count once, not every click',()=>{
 let s=emptyLearning();s=completeLessonStep(s,'intro','rule',['rule','task'],now);s=completeLessonStep(s,'intro','task',['rule','task'],now);assert.equal(weeklyReport(s,now).lessons,1);assert.equal(completeLessonStep(s,'intro','task',['rule','task'],now),s);
 s=applyAttempt(s,{...attempt,correct:false},'wrong',now);s=applyAttempt(s,attempt,'first',now+1000);s=applyAttempt(s,attempt,'second',now+intervals[1]);s=applyAttempt(s,attempt,'third',now+intervals[1]+1000);assert.equal(weeklyReport(s,now+intervals[1]+1000).resolved,1);
});
test('Journal retains recent summaries and compares only a fully observed previous week',()=>{
 let s=applyAttempt(emptyLearning(),attempt,'old',now-100*86400_000);s=applyAttempt(s,attempt,'recent',now);assert.equal(Object.keys(s.journal.days).length,1);assert.ok(validLearning(s));assert.equal(weeklyReport(s,now).comparison,1);
});
test('Specific error explanations select the correct rule and respect alternate answers',()=>{
 const explain=(a,b,d='sentence')=>diagnose(a,[b],d);
 assert.equal(explain('Ich lerne Deutsch, weil ich wohne in Berlin.','Ich lerne Deutsch, weil ich in Berlin wohne.').id,'subordinate-order');
 assert.equal(explain('Lerne ich Deutsch, weil ich in Berlin wohne.','Ich lerne Deutsch, weil ich in Berlin wohne.').id,'main-order');
 assert.equal(explain('Du kommst heute?','Kommst du heute?').rule,'questions');
 assert.equal(explain('Du wann kommst?','Wann kommst du?').id,'w-question');
 assert.equal(explain('Ich gelernt habe Deutsch.','Ich habe Deutsch gelernt.').rule,'past');
 assert.equal(explain('Ich kommen kann heute.','Ich kann heute kommen.').id,'modal-frame');
 assert.equal(explain('Buch','das Buch','word').id,'missing-article');
 assert.equal(explain('das buch','das Buch','word').id,'capitalization');
 assert.equal(explain('Bucher','Bücher','noun').id,'umlaut');
 assert.equal(explain('die','der','noun').id,'gender');
 assert.equal(explain('machtet','machst','verb').rule,'verbs');
 assert.equal(explain('Ich wohne Berlin.','Ich wohne in Berlin.').id,'compare');
 assert.ok(diagnose('Du kommst wann?',['Wann kommst du?'],'sentence').detail.uk);
});
