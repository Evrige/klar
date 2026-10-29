import type {AchievementStats,EarnedAchievements} from './achievements.ts';
export const achievementTracks=[
 {id:'lessons',prefix:'lesson',kind:'book',ru:'Путь ученика',uk:'Шлях учня',description:'Завершённые уроки с практикой',descriptionUk:'Завершені уроки з практикою',steps:[1,5,10,25,50,100,250]},
 {id:'known',prefix:'known',kind:'star',ru:'Знакомые слова',uk:'Знайомі слова',description:'Слова в вашем списке «Знаю» · самооценка',descriptionUk:'Слова у вашому списку «Знаю» · самооцінка',steps:[10,50,100,250,500,1000,2000]},
 {id:'testedWords',prefix:'words',kind:'gem',ru:'Проверенный словарь',uk:'Перевірений словник',description:'Разные слова с правильными ответами',descriptionUk:'Різні слова з правильними відповідями',steps:[10,50,100,250,500,1000,2000]},
 {id:'verbs',prefix:'verb',kind:'target',ru:'Мастер глаголов',uk:'Майстер дієслів',description:'Глаголы со всеми закреплёнными формами',descriptionUk:'Дієслова з усіма закріпленими формами',steps:[1,5,10,25,50,71]},
 {id:'sentences',prefix:'sentence',kind:'puzzle',ru:'Мысль за мыслью',uk:'Думка за думкою',description:'Разные правильно собранные предложения',descriptionUk:'Різні правильно складені речення',steps:[10,50,100,250,500,1000,1588]},
 {id:'streak',prefix:'streak',kind:'flame',ru:'Ритм учёбы',uk:'Ритм навчання',description:'Лучшая серия учебных дней подряд',descriptionUk:'Найкраща серія навчальних днів поспіль',steps:[3,10,30,60,100,150,200,250,300,365]}
] as const;
export function trackSteps(track:typeof achievementTracks[number],value:number){
 const steps:number[]=[...track.steps];if(track.id==='streak'){let next=465;while(next<=Math.max(Math.min(value+100,36500),465)){steps.push(next);next+=100;}}return steps;
}
export function achievementCards(stats:AchievementStats,earned:EarnedAchievements){return achievementTracks.map(track=>{
 let saved=0;for(const id of Object.keys(earned)){if(id.startsWith(track.prefix+'-')){const threshold=Number(id.slice(track.prefix.length+1));if(Number.isFinite(threshold))saved=Math.max(saved,threshold);}}
 const value=Math.max(stats[track.id],saved);const steps=trackSteps(track,value);const achieved=steps.filter(step=>step<=value);const rank=achieved.length;const current=achieved.at(-1)??0;const next=steps.find(step=>step>value);const skin:'locked'|'bronze'|'silver'|'gold'|'diamond'=rank===0?'locked':rank===1?'bronze':rank===2?'silver':rank===3?'gold':'diamond';
 return {...track,value,rank,current,next,skin,percent:next?Math.min(100,(value-current)/(next-current)*100):100,earnedAt:earned[`${track.prefix}-${current}`]};
});}
export function validTrackAward(id:string){return achievementTracks.some(track=>{if(!id.startsWith(track.prefix+'-'))return false;const n=Number(id.slice(track.prefix.length+1));return Number.isSafeInteger(n)&&(track.steps as readonly number[]).includes(n)||track.id==='streak'&&Number.isSafeInteger(n)&&n>=465&&n<=36500&&(n-465)%100===0;});}
