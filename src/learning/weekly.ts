import {studyDate,type LearningState} from './model.ts';
export function weekDates(now:number,offset=0){const today=studyDate(now);const noon=Date.parse(today+'T12:00:00Z');return Array.from({length:7},(_,i)=>new Date(noon+(i-6+offset)*86400_000).toISOString().slice(0,10));}
export function weeklyReport(state:LearningState,now:number,activityDays:string[]=state.days){
 const dates=weekDates(now),previous=weekDates(now,-7),logs=dates.flatMap(d=>state.journal?.days[d]?[state.journal.days[d]]:[]);
 const sum=(key:'attempts'|'correct')=>logs.reduce((n,l)=>n+l[key],0);
 const unique=(key:'words'|'skills'|'resolved'|'lessons')=>new Set(logs.flatMap(l=>l[key])).size;
 const attempts=sum('attempts'),correct=sum('correct');
 const active=Object.values(state.mistakes).filter(m=>!m.resolved&&m.lastWrong<=now);
 const weak=Object.entries(active.reduce<Record<string,number>>((out,m)=>{out[m.domain]=(out[m.domain]??0)+1;return out;},{})).sort((a,b)=>b[1]-a[1]);
 const previousAttempts=previous.reduce((n,d)=>n+(state.journal?.days[d]?.attempts??0),0);
 return {dates,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null,words:unique('words'),skills:unique('skills'),resolved:unique('resolved'),lessons:unique('lessons'),activeDays:dates.filter(d=>activityDays.includes(d)).length,weak,due:Object.values(state.skills).filter(s=>s.due<=now).length,activeErrors:active.length,comparison:state.journal&&state.journal.started<=previous[0]?attempts-previousAttempts:null};
}
