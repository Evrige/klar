import test from 'node:test';
import assert from 'node:assert/strict';
import {courseLessons,courseLevels,lessonComplete,nextLesson,parseCourseImport,mergeCourseProgress,validCourseProgress} from '../src/data/course.ts';
import {eligibleAchievements,currentStreak,longestStreak,validActivity} from '../src/data/achievements.ts';
import {translateRussian} from '../src/lib/translate.ts';
test('Course preserves 228 stable video identifiers, levels and ordered lesson numbers',()=>{
 assert.equal(courseLessons.length,228);assert.equal(new Set(courseLessons.map(l=>l.id)).size,228);
 assert.deepEqual(courseLevels,['A0','A1','A2','B1','B2','C1','C2']);
 for(const [level,count] of [['A0',50],['A1',50],['A2',50],['B1',50],['B2',28]]){
  const lessons=courseLessons.filter(l=>l.level===level);assert.equal(lessons.length,count);assert.deepEqual(lessons.map(l=>l.number),Array.from({length:count},(_,i)=>i+1));
 }
 assert.equal(courseLessons.filter(l=>l.level==='C1'||l.level==='C2').length,0);
 assert.ok(courseLessons.every(l=>l.id===`youtube-${l.videoId}`&&new URL(l.url).searchParams.get('v')===l.videoId));
});
test('Course completion requires both marks, next lesson follows actual progress',()=>{
 const first=courseLessons[0];assert.equal(lessonComplete({video:true,practice:false,note:''}),false);
 assert.equal(nextLesson({[first.id]:{video:true,practice:false,note:''}}).id,first.id);
 assert.equal(nextLesson({[first.id]:{video:true,practice:true,note:''}}).id,courseLessons[1].id);
});
test('Platform backup import ignores other courses, validates first and merges without clearing marks',()=>{
 const id=courseLessons[0].id;const previous={[id]:{video:true,practice:false,note:'Existing'}};
 const incoming=parseCourseImport({lessons:[{id:'other-course',video:true},{id,video:false,practice:true,note:'Imported'}],sessions:[]});
 const merged=mergeCourseProgress(previous,incoming);assert.equal(merged[id].video,true);assert.equal(merged[id].practice,true);assert.match(merged[id].note,/Existing/);assert.match(merged[id].note,/Imported/);assert.ok(validCourseProgress(merged));assert.equal(previous[id].practice,false);
 assert.throws(()=>parseCourseImport({lessons:[{id,video:'true',practice:true,note:''}]}));
 assert.throws(()=>parseCourseImport({lessons:[{id,video:true,practice:true,note:''},{id,video:true,practice:true,note:''}]}));
 assert.throws(()=>parseCourseImport({lessons:[{id:'unknown',video:true,practice:true,note:''}]}));
});
test('Study streak survives month and daylight-saving boundaries, expires after a missed day',()=>{
 assert.equal(currentStreak(['2026-10-24','2026-10-25','2026-10-26'],'2026-10-27'),3);
 assert.equal(currentStreak(['2026-10-24','2026-10-25','2026-10-26'],'2026-10-28'),0);
 assert.equal(longestStreak(['2026-03-30','2026-03-29','2026-03-29','2026-03-31','2026-04-01']),4);
 assert.equal(currentStreak([],'2026-10-28'),0);
 assert.ok(validActivity({days:[],words:[]}));
});
test('Self-assessed words cannot unlock tested-word rewards; streak uses achievements separately',()=>{
 const stats={lessons:0,known:100,testedWords:0,verbs:0,sentences:0,streak:0};
 assert.ok(eligibleAchievements(stats).length>0);assert.ok(eligibleAchievements(stats).every(a=>a.metric==='known'));
 assert.ok(eligibleAchievements({...stats,testedWords:10}).some(a=>a.id==='words-10'));
 assert.ok(eligibleAchievements({...stats,streak:7}).some(a=>a.id==='streak-7'));
});
test('Ukrainian input uses uk|de, with an offline football example',async()=>{
 let called=false;const local=await translateRussian('Я вчора грав у футбол із друзями',{sourceLanguage:'uk',fetcher:()=>{called=true;throw Error('offline');}});
 assert.equal(called,false);assert.equal(local.german,'Ich habe gestern mit Freunden Fußball gespielt.');
 await translateRussian('Я хочу купити квиток.',{sourceLanguage:'uk',fetcher:async url=>{
  assert.equal(new URL(url).searchParams.get('langpair'),'uk|de');return new Response(JSON.stringify({responseStatus:200,responseData:{translatedText:'Ich möchte eine Fahrkarte kaufen.'}}));
 }});
});
