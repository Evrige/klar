import {vocabulary} from './vocabulary.ts';
import {nouns} from './nouns.ts';
import {sentences} from './sentences.ts';
import {ruleTopics} from './rules.ts';
import {shuffle} from './vocabularyPractice.ts';
export type DailyRecord={ruleRead:boolean;words:string[];nounsDone:boolean;sentenceDone:boolean};
export type DailyProgress=Record<string,DailyRecord>;
export const emptyDay=():DailyRecord=>({ruleRead:false,words:[],nounsDone:false,sentenceDone:false});
export function berlinDate(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function randomFor(seed:string){let value=2166136261;for(const c of seed)value=Math.imul(value^c.charCodeAt(0),16777619);return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function makeDailyPlan(date:string){
 const random=randomFor(date);
 const topic=ruleTopics[Math.floor(random()*ruleTopics.length)];
 const sentenceByTopic:Record<string,string>={verbs:'learn',cases:'dative',pronouns:'accusative',sentences:'inversion',prepositions:'location',adjectives:'not',past:'perfect'};
 return {topic,words:shuffle(vocabulary,random).slice(0,5),nouns:shuffle(nouns,random).slice(0,2),sentence:sentences.find(s=>s.id===sentenceByTopic[topic.id])!};
}
const wordIds=new Set(vocabulary.map(w=>w.id));
export function validDailyProgress(value:unknown):value is DailyProgress{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([date,raw])=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!raw||typeof raw!=='object')return false;
  const d=raw as DailyRecord;
  return typeof d.ruleRead==='boolean'&&typeof d.nounsDone==='boolean'&&typeof d.sentenceDone==='boolean'&&Array.isArray(d.words)&&d.words.every(id=>typeof id==='string'&&wordIds.has(id))&&new Set(d.words).size===d.words.length;
 });
}
