import type {Verb} from './verbs.ts';
import {shuffle} from './vocabularyPractice.ts';
export type VerbTask={key:string;person:number;kind:'form'|'gap'|'question'|'correction';sentence:string;answer:string;wrong?:string};
const subjects=['ich','du','er','wir','ihr','sie'];
const contexts:Record<string,string>={machen:'die Hausaufgaben',lernen:'Deutsch',arbeiten:'im Büro',heißen:'mit Nachnamen Müller',sein:'heute zu Hause',haben:'heute Zeit',werden:'langsam müde',sprechen:'Deutsch',lesen:'ein Buch',fahren:'nach Berlin',nehmen:'ein Glas Wasser',essen:'Brot',können:'gut schwimmen',müssen:'heute arbeiten',wollen:'Deutsch lernen',dürfen:'hier sitzen',sollen:'mehr Wasser trinken',mögen:'Musik',wissen:'die Antwort',wohnen:'in Berlin',kommen:'heute',gehen:'nach Hause',hören:'Musik',schreiben:'einen Brief',spielen:'Fußball',kaufen:'ein Buch',trinken:'Wasser',kochen:'eine Suppe',suchen:'den Schlüssel',finden:'eine Lösung',sehen:'den Bus',leben:'in Deutschland',brauchen:'Hilfe',fragen:'den Lehrer',antworten:'dem Lehrer',kosten:'drei Euro',lieben:'Musik',reisen:'nach Wien',helfen:'einem Freund',geben:'dem Kind das Buch',schlafen:'gut',laufen:'im Park',treffen:'einen Freund',tragen:'eine Tasche',halten:'das Glas',bringen:'das Essen',denken:'an die Zukunft',kennen:'diese Stadt',verstehen:'die Frage',erklären:'die Regel',besuchen:'einen Freund',bezahlen:'die Rechnung',erzählen:'eine Geschichte',warten:'auf den Bus',öffnen:'das Fenster',entscheiden:'über den Vorschlag',empfehlen:'dieses Buch',vergessen:'oft den Schlüssel',verlieren:'manchmal die Geduld',gewinnen:'das Spiel',vergleichen:'die Preise',erkennen:'das Problem',versprechen:'Hilfe',erreichen:'das Ziel',vermeiden:'unnötigen Stress',ermöglichen:'neue Kontakte',erwarten:'eine Antwort',verbessern:'die Aussprache',berichten:'über die Reise',unterstützen:'einen Freund',überzeugen:'die Jury'};
const capitalize=(s:string)=>s[0].toLocaleUpperCase('de-DE')+s.slice(1);
export function makeVerbTasks(verb:Verb,limit=24,random=Math.random):VerbTask[]{
 const tail=contexts[verb.id];if(!tail)throw new Error(`Missing practice context: ${verb.id}`);
 const pool:VerbTask[]=[];
 const frames=verb.id==='kosten'?[{person:2,subject:'das Ticket'},{person:2,subject:'der Kaffee'},{person:2,subject:'die Fahrkarte'},{person:5,subject:'die Brötchen'},{person:2,subject:'das Brot'},{person:5,subject:'die Äpfel'}]:subjects.map((subject,person)=>({subject,person}));
 for(let frame=0;frame<frames.length;frame++){
  const {person,subject}=frames[frame];const answer=verb.forms[person];const wrong=verb.forms.find(f=>f!==answer)!;
  pool.push({key:`${verb.id}:${frame}:form`,person,kind:'form',sentence:subject,answer});
  pool.push({key:`${verb.id}:${frame}:gap`,person,kind:'gap',sentence:`${capitalize(subject)} ___ ${tail}.`,answer});
  pool.push({key:`${verb.id}:${frame}:question`,person,kind:'question',sentence:`___ ${subject} ${tail}?`,answer});
  pool.push({key:`${verb.id}:${frame}:correction`,person,kind:'correction',sentence:`${capitalize(subject)} ${wrong} ${tail}.`,answer,wrong});
 }
 // Each full round contains 24 distinct tasks; a longer session starts another shuffled round.
 const result:VerbTask[]=[];while(result.length<limit)result.push(...shuffle(pool,random).slice(0,Math.min(pool.length,limit-result.length)));
 return result;
}
export function solvedVerbSentence(task:VerbTask){if(task.kind==='form')return `${task.sentence} ${task.answer}`;if(task.kind==='correction')return task.sentence.replace(` ${task.wrong} `,` ${task.answer} `);return task.sentence.replace('___',task.kind==='question'?capitalize(task.answer):task.answer);}
