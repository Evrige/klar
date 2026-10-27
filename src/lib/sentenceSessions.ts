import type {Sentence} from '../data/sentences.ts';
import {shuffle} from '../data/vocabularyPractice.ts';
export function makeSentenceSession(pool:Sentence[],mastered:string[],limit:number,random=Math.random){
 const known=new Set(mastered);
 return [...shuffle(pool.filter(s=>!known.has(s.id)),random),...shuffle(pool.filter(s=>known.has(s.id)),random)].slice(0,limit);
}
