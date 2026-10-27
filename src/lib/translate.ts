import {sentences, type Sentence} from '../data/sentences.ts';
export type TranslationResult={russian:string;german:string;source:'library'|'online';explanation?:string;sentence?:Sentence};
export function normalizeRussian(text:string){return text.trim().normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[.!?,;:«»"“”]/g,'').replace(/\s+/g,' ');}
export function decodeTranslation(text:string){return text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|auml|ouml|uuml|szlig);/gi,(_,entity:string)=>{
 const named:Record<string,string>={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',auml:'ä',ouml:'ö',uuml:'ü',Auml:'Ä',Ouml:'Ö',Uuml:'Ü',szlig:'ß'};
 if(entity.startsWith('#')){const hex=entity[1].toLowerCase()==='x';const code=parseInt(entity.slice(hex?2:1),hex?16:10);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}return named[entity]??named[entity.toLowerCase()]??'';
 }).trim();}
const football:Sentence={id:'personal-football',topic:'Прошедшее время',german:'Ich habe gestern mit Freunden Fußball gespielt.',translation:'Я вчера играл в футбол с друзьями.',hint:'Начните с Ich. Habe — на второй позиции, gespielt — в конце.',explanation:'Это Perfekt: ich habe … gespielt. Gestern — вчера; mit Freunden — с друзьями (mit требует Dativ); Fußball spielen — играть в футбол. Gestern можно поставить в начало: Gestern habe ich mit Freunden Fußball gespielt.',alternatives:['Ich habe gestern Fußball mit Freunden gespielt','Gestern habe ich mit Freunden Fußball gespielt','Gestern habe ich Fußball mit Freunden gespielt']};
export const phraseExamples=[football.translation,'Можно мне здесь сесть?','Я не могу сегодня прийти.','Мы хотим учить немецкий.'];
export function findLocalTranslation(text:string):TranslationResult|undefined{
 const normalized=normalizeRussian(text);
 const entry=[football,...sentences].find(s=>normalizeRussian(s.translation)===normalized);
 return entry?{russian:text.trim(),german:entry.german,source:'library',explanation:entry.explanation,sentence:entry}:undefined;
}
export async function translateRussian(text:string,{signal,fetcher=fetch}:{signal?:AbortSignal;fetcher?:typeof fetch}={}):Promise<TranslationResult>{
 const russian=text.trim();
 if(!russian)throw new Error('Напишите предложение на русском.');
 if(new TextEncoder().encode(russian).byteLength>500)throw new Error('Фраза слишком длинная. Разделите её на несколько предложений (до 500 байт за раз).');
 const local=findLocalTranslation(russian);if(local)return local;
 if(!/[а-яё]/i.test(russian))throw new Error('Введите исходную фразу на русском языке.');
 const controller=new AbortController();
 const abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetcher(`https://api.mymemory.translated.net/get?${new URLSearchParams({q:russian,langpair:'ru|de',mt:'1'})}`,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
  if(response.status===429)throw new Error('Лимит онлайн-перевода временно исчерпан. Попробуйте позже; упражнения из библиотеки работают без сети.');
  if(!response.ok)throw new Error('Сервис перевода временно недоступен. Попробуйте ещё раз позже.');
  const data:unknown=await response.json();
  if(!data||typeof data!=='object')throw new Error('Сервис не вернул перевод. Попробуйте переформулировать фразу.');
  const body=data as {quotaFinished?:boolean;responseStatus?:number|string;responseData?:{translatedText?:unknown}};
  if(body.quotaFinished||Number(body.responseStatus)===429)throw new Error('Дневной лимит перевода исчерпан. Встроенная библиотека предложений остаётся доступной.');
  const raw=body.responseData?.translatedText;
  if(Number(body.responseStatus)!==200||typeof raw!=='string'||!raw.trim()||/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|PLEASE SELECT TWO DISTINCT/i.test(raw))throw new Error('Сервис не вернул перевод. Попробуйте переформулировать фразу.');
  const german=decodeTranslation(raw);
  if(!/[a-zäöüß]/i.test(german)||german.length>3000)throw new Error('Не удалось получить немецкий перевод. Попробуйте более короткую фразу.');
  return {russian,german,source:'online'};
 }catch(error){
  if(signal?.aborted)throw new DOMException('Отменено','AbortError');
  if(controller.signal.aborted)throw new Error('Перевод занял слишком много времени. Проверьте интернет и попробуйте снова.');
  if(error instanceof TypeError)throw new Error('Нет связи с переводчиком. Проверьте интернет. Фразы из библиотеки доступны офлайн.');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
