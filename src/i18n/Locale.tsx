import {createContext,useContext,useEffect,useMemo,type ReactNode} from 'react';
import {useStoredState} from '../hooks/useStoredState';
import {ukrainian} from './uk';
export type Locale='ru'|'uk';
type LocaleValue={locale:Locale;setLocale:(locale:Locale)=>void;t:<T>(text:T,uk?:string)=>T};
const LocaleContext=createContext<LocaleValue|null>(null);
export function translateText(text:string,locale:Locale,uk?:string){
 if(locale==='ru')return text;if(uk!==undefined)return uk;
 const stripped=text.trim();const translated=ukrainian[stripped];
 if(translated)return text.replace(stripped,translated);
 const steps=stripped.match(/^Выполнено (\d+) из (\d+) шагов$/);if(steps)return `Виконано ${steps[1]} із ${steps[2]} кроків`;
 for(const [ru,ua] of [['Правильная форма:','Правильна форма:'],['Правильный перевод:','Правильний переклад:'],['Правильно:','Правильно:'],['Немецкий голос:','Німецький голос:'],['Озвучить ','Озвучити '],['Убрать слово ','Прибрати слово '],['Перевод ','Переклад ']])if(stripped.startsWith(ru))return text.replace(stripped,ua+stripped.slice(ru.length));
 // Numeric labels use separately translated fragments, without changing German text.
 const match=stripped.match(/^(Правильно:|Выполнено|Найдено:|КАРТОЧКА|ПРАКТИКА ·|СЛОВАРНЫЙ ЗАПАС ·)(.*)$/);
 return match?text.replace(stripped,(ukrainian[match[1]]??match[1])+match[2]):text;
}
export function LocaleProvider({children}:{children:ReactNode}){
 const [locale,setLocale]=useStoredState<Locale>('klar:locale:v1','ru',(v):v is Locale=>v==='ru'||v==='uk');
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 const value=useMemo<LocaleValue>(()=>({locale,setLocale,t:<T,>(text:T,uk?:string):T=>{
  if(typeof text==='string')return translateText(text,locale,uk) as T;
  if(Array.isArray(text))return text.map(s=>typeof s==='string'?translateText(s,locale):s) as T;
  return text;
 }}),[locale,setLocale]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale(){const context=useContext(LocaleContext);if(!context)throw new Error('LocaleProvider is required');return context;}
