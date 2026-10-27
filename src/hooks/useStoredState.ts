import { useState, useEffect } from 'react';
export function useStoredState<T>(key:string,initial:T,validate:(value:unknown)=>value is T){
 const [value,setValue]=useState<T>(()=>{try{const parsed:unknown=JSON.parse(localStorage.getItem(key)??'null');return validate(parsed)?parsed:initial;}catch{return initial;}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage can be unavailable in private browsing. */}},[key,value]);
 return [value,setValue] as const;
}
