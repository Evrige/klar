import { useState, useEffect, useRef } from 'react';
import {storageKey,storageOwner,scheduleSnapshot,queueStorageChange,markSnapshotDirty} from '../sync/storage';
export function useStoredState<T>(key:string,initial:T,validate:(value:unknown)=>value is T){
 const mountedOwner=useRef(storageOwner()).current;
 const [storageError,setStorageError]=useState<string|null>(null);
 const [value,setValue]=useState<T>(()=>{try{const parsed:unknown=JSON.parse(localStorage.getItem(storageKey(key))??'null');return validate(parsed)?parsed:initial;}catch{return initial;}});
 useEffect(()=>{if(mountedOwner!==storageOwner())return;try{const target=storageKey(key),raw=JSON.stringify(value),previous=localStorage.getItem(target);if(previous!==raw){queueStorageChange(key,previous,value);markSnapshotDirty();localStorage.setItem(target,raw);scheduleSnapshot();}setStorageError(null);}catch{setStorageError('Не удалось сохранить данные в браузере. Скачайте копию перед выходом.');}},[key,value,mountedOwner]);
 return [value,setValue,storageError] as const;
}
