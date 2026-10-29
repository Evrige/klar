import { useState, useEffect } from 'react';
export function useStoredState<T>(key:string,initial:T,validate:(value:unknown)=>value is T){
 const [storageError,setStorageError]=useState<string|null>(null);
 const [value,setValue]=useState<T>(()=>{try{const parsed:unknown=JSON.parse(localStorage.getItem(key)??'null');return validate(parsed)?parsed:initial;}catch{return initial;}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));setStorageError(null);}catch{setStorageError('Не удалось сохранить данные в браузере. Скачайте копию перед выходом.');}},[key,value]);
 return [value,setValue,storageError] as const;
}
