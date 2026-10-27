import { vocabulary, type Word } from './vocabulary.ts';
export type WordQuestion = {word:Word;options:string[]};
export function shuffle<T>(items:readonly T[],random= Math.random):T[]{
 const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function makeWordSession(pool:Word[],limit=20,random=Math.random):WordQuestion[]{
 return shuffle(pool,random).slice(0,limit).map(word=>{
  const meanings=[...new Set(vocabulary.filter(w=>w.translation!==word.translation).map(w=>w.translation))];
  const alternatives=shuffle(meanings,random).slice(0,3);
  return {word,options:shuffle([word.translation,...alternatives],random)};
 });
}
