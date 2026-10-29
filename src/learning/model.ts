export const skills=['recognition','recall','spelling','listening'] as const;
export type SkillMode=typeof skills[number];
export type SkillState={attempts:number;correct:number;stage:number;due:number;last:number};
export type Attempt={key:string;domain:'word'|'verb'|'sentence'|'noun'|'lesson';prompt:string;answers:string[];answer:string;correct:boolean;explanation:string;wordId?:string;mode?:SkillMode;lessonId?:string;audio?:string;caseSensitive?:boolean};
export type Mistake=Attempt&{failures:number;lastWrong:number;due:number;recovery:number;resolved:boolean};
export type LearningState={version:1;skills:Record<string,SkillState>;mistakes:Record<string,Mistake>;lessons:Record<string,string[]>;processed:string[];days:string[]};
export const emptyLearning=():LearningState=>({version:1,skills:{},mistakes:{},lessons:{},processed:[],days:[]});
export function studyDate(now:number){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
export const intervals=[10*60_000,86400_000,3*86400_000,7*86400_000,14*86400_000,30*86400_000,60*86400_000];
export const skillKey=(id:string,mode:SkillMode)=>`${mode}:${id}`;
export function normalizeAnswer(text:string){return text.normalize('NFC').toLocaleLowerCase('de-DE').replace(/[.,!?;:«»„“”]/g,'').replace(/\s+/g,' ').trim();}
export function acceptedAnswer(answer:string,answers:readonly string[]){return !!normalizeAnswer(answer)&&answers.some(expected=>normalizeAnswer(expected)===normalizeAnswer(answer));}
export function acceptedSpelling(answer:string,answers:readonly string[]){const canonical=(s:string)=>{const text=s.normalize('NFC').replace(/[.,!?;:]/g,'').replace(/\s+/g,' ').trim();return text?text[0].toLocaleUpperCase('de-DE')+text.slice(1):'';};return !!canonical(answer)&&answers.some(expected=>canonical(answer)===canonical(expected));}
export function answerFeedback(answer:string,answers:string[],domain:Attempt['domain']){
 if(acceptedAnswer(answer,answers)){if(!acceptedSpelling(answer,answers))return `Проверьте заглавные буквы: ${answers[0]}. Немецкие существительные пишутся с большой буквы.`;return 'Верно. Ответ соответствует одному из подготовленных вариантов.';}
 const target=answers[0]??'';const actual=normalizeAnswer(answer),expected=normalizeAnswer(target);
 if(!actual)return 'Сначала введите ответ.';
 const transliteration=(s:string)=>s.replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
 if(transliteration(actual)===transliteration(expected))return `Проверьте немецкие буквы ä, ö, ü и ß. Правильно: ${target}`;
 if(domain==='sentence'||domain==='lesson'){
  if(actual.split(' ').sort().join(' ')===expected.split(' ').sort().join(' '))return 'Слова подобраны, но их порядок не совпадает с допустимой конструкцией. Найдите спрягаемый глагол: в обычном утверждении он занимает вторую позицию, в вопросе да/нет — первую. После weil/dass — конец придаточного.';
 }
 if(/^(der|die|das) /.test(expected)&&actual===expected.replace(/^(der|die|das) /,''))return `Слово написано верно. Добавьте артикль: ${target}.`;
 return `Сравните ответ с образцом: ${target}. ${domain==='word'?'Для перевода принимаются значения, перечисленные на карточке; свободные синонимы автоматическая проверка может не распознать.':'Проверьте личную форму, окончание и условия задания.'}`;
}
export function applyAttempt(state:LearningState,attempt:Attempt,eventId:string,now:number):LearningState{
 if(state.processed.includes(eventId))return state;
 const next={...state,skills:{...state.skills},mistakes:{...state.mistakes},processed:[...state.processed,eventId].slice(-200),days:[...new Set([...state.days,studyDate(now)])]};
 if(attempt.wordId&&attempt.mode){const key=skillKey(attempt.wordId,attempt.mode);const old=state.skills[key]??{attempts:0,correct:0,stage:0,due:now,last:0};
  const advance=!old.attempts||old.due<=now;
  const stage=attempt.correct?(advance?Math.min(old.stage+1,intervals.length):old.stage):0;
  next.skills[key]={attempts:old.attempts+1,correct:old.correct+Number(attempt.correct),stage,last:now,due:attempt.correct&&!advance?old.due:now+(attempt.correct?intervals[Math.max(0,stage-1)]:intervals[0])};
 }
 const old=state.mistakes[attempt.key];
 if(!attempt.correct)next.mistakes[attempt.key]={...attempt,failures:(old?.failures??0)+1,lastWrong:now,due:now+intervals[0],recovery:0,resolved:false};
 else if(old){const recovery=old.recovery+1;next.mistakes[attempt.key]={...old,recovery,due:now+intervals[1],resolved:recovery>=2&&now-old.lastWrong>=intervals[1]};}
 return next;
}
export function validLearning(value:unknown):value is LearningState{
 if(!value||typeof value!=='object')return false;const v=value as LearningState;
 const record=(o:unknown)=>!!o&&typeof o==='object'&&!Array.isArray(o);
 const validDay=(d:unknown)=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(v.version!==1||!record(v.skills)||!record(v.mistakes)||!record(v.lessons)||!Array.isArray(v.processed)||v.processed.length>200||!v.processed.every(id=>typeof id==='string')||!Array.isArray(v.days)||!v.days.every(validDay))return false;
 if([v.skills,v.mistakes,v.lessons].some(o=>Object.keys(o).some(key=>['__proto__','constructor','prototype'].includes(key))))return false;
 if(!Object.entries(v.skills).every(([key,s])=>skills.some(mode=>key.startsWith(mode+':')&&key.length>mode.length+1)&&record(s)&&[s.attempts,s.correct,s.stage,s.due,s.last].every(n=>Number.isFinite(n)&&n>=0)&&Number.isInteger(s.stage)&&s.stage<=intervals.length&&s.correct<=s.attempts))return false;
 if(!Object.values(v.lessons).every(ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string')&&new Set(ids).size===ids.length))return false;
 return Object.entries(v.mistakes).every(([key,m])=>record(m)&&m.key===key&&['word','verb','sentence','noun','lesson'].includes(m.domain)&&typeof m.prompt==='string'&&Array.isArray(m.answers)&&m.answers.length>0&&m.answers.every(a=>typeof a==='string')&&typeof m.answer==='string'&&typeof m.explanation==='string'&&typeof m.correct==='boolean'&&typeof m.resolved==='boolean'&&[m.failures,m.lastWrong,m.due,m.recovery].every(n=>Number.isFinite(n)&&n>=0)&&(m.audio===undefined||typeof m.audio==='string')&&(m.mode===undefined||skills.includes(m.mode))&&(m.wordId===undefined||typeof m.wordId==='string')&&(m.lessonId===undefined||typeof m.lessonId==='string')&&(m.caseSensitive===undefined||typeof m.caseSensitive==='boolean'));
}
export function reviewQueue<T extends {id:string}>(words:T[],progress:LearningState['skills'],mode:SkillMode,now:number,limit=12){
 const due=words.filter(w=>progress[skillKey(w.id,mode)]?.due<=now).sort((a,b)=>progress[skillKey(a.id,mode)].due-progress[skillKey(b.id,mode)].due);
 const fresh=words.filter(w=>!progress[skillKey(w.id,mode)]);
 return [...due,...fresh].slice(0,limit);
}
