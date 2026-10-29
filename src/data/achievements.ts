import {achievementTracks,trackSteps,validTrackAward} from './achievementTracks.ts';
export type LearningActivity={days:string[];words:string[]};
export function validActivity(v:unknown):v is LearningActivity{return !!v&&typeof v==='object'&&'days' in v&&'words' in v&&Array.isArray(v.days)&&v.days.every(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))&&Array.isArray(v.words)&&v.words.every(w=>typeof w==='string');}
function previousDay(date:string){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
export function currentStreak(days:string[],today:string){const active=new Set(days);let date=active.has(today)?today:previousDay(today),count=0;while(active.has(date)){count++;date=previousDay(date);}return count;}
export function longestStreak(days:string[]){let best=0,run=0,last='';for(const date of [...new Set(days)].sort()){run=previousDay(date)===last?run+1:1;best=Math.max(best,run);last=date;}return best;}
export type AchievementStats={lessons:number;known:number;testedWords:number;verbs:number;sentences:number;streak:number};
export const achievementDefinitions=[
 {id:'lesson-1',title:'Первый урок',description:'Завершите просмотр и практику одного урока.',metric:'lessons',target:1,kind:'book'},
 {id:'known-10',title:'Знакомые слова',description:'Отметьте 10 слов как «Знаю». Самооценка.',metric:'known',target:10,kind:'star'},
 ...[10,50,100].map(target=>({id:`words-${target}`,title:`Проверено: ${target} слов`,description:'Правильно ответьте на разные слова в тренировке.',metric:'testedWords' as const,target,kind:'gem' as const})),
 {id:'verb-1',title:'Шесть из шести',description:'Закрепите все формы одного глагола.',metric:'verbs',target:1,kind:'target'},
 {id:'sentence-10',title:'Мысль за мыслью',description:'Правильно соберите 10 разных предложений.',metric:'sentences',target:10,kind:'puzzle'},
 ...[3,7,30].map(target=>({id:`streak-${target}`,title:`Ритм: ${target} ${target===3?'дня':'дней'}`,description:'Выполняйте задания несколько дней подряд.',metric:'streak' as const,target,kind:'flame' as const}))
] as const;
export type EarnedAchievements=Record<string,string>;
export function validEarned(v:unknown):v is EarnedAchievements{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,d])=>(achievementDefinitions.some(a=>a.id===k)||validTrackAward(k)||/^streak-\d+$/.test(k)&&Number(k.slice(7))>=40&&Number(k.slice(7))%10===0)&&typeof d==='string'&&Number.isFinite(Date.parse(d)));}
export function achievementsFor(stats:AchievementStats){const last=Math.max(40,Math.floor(stats.streak/10)*10+10);const additions=achievementTracks.flatMap(track=>trackSteps(track,stats[track.id]).map(target=>({id:`${track.prefix}-${target}`,title:track.ru,description:track.description,metric:track.id,target,kind:track.kind})));return [...new Map([...achievementDefinitions,...additions,...Array.from({length:(last-40)/10+1},(_,i)=>40+i*10).map(target=>({id:`streak-${target}`,title:`Ритм: ${target} дней`,description:'Выполняйте задания несколько дней подряд.',metric:'streak' as const,target,kind:'flame' as const}))].map(a=>[a.id,a])).values()];}
export function eligibleAchievements(stats:AchievementStats){return achievementsFor(stats).filter(a=>stats[a.metric as keyof AchievementStats]>=a.target);}
