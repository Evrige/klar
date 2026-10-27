import {useEffect,useRef,useState} from 'react';
export function usePwaUpdates(){
 const [needRefresh,setNeedRefresh]=useState(false),[offlineReady,setOfflineReady]=useState(false);
 const registrationRef=useRef<ServiceWorkerRegistration|null>(null),reloadRef=useRef(false);
 useEffect(()=>{
  if(!import.meta.env.PROD||!('serviceWorker'in navigator))return;
  let disposed=false;let installing:ServiceWorker|null=null;
  const stateChanged=()=>{if(disposed||installing?.state!=='installed')return;if(navigator.serviceWorker.controller)setNeedRefresh(true);else setOfflineReady(true);};
  const updateFound=()=>{installing?.removeEventListener('statechange',stateChanged);installing=registrationRef.current?.installing??null;installing?.addEventListener('statechange',stateChanged);};
  const changed=()=>{if(reloadRef.current)window.location.reload();};
  navigator.serviceWorker.addEventListener('controllerchange',changed);
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(registration=>{
   if(disposed)return;registrationRef.current=registration;
   if(registration.waiting&&navigator.serviceWorker.controller)setNeedRefresh(true);
   registration.addEventListener('updatefound',updateFound);updateFound();
  }).catch(()=>{/* The application remains usable online if the browser blocks offline storage. */});
  return()=>{disposed=true;installing?.removeEventListener('statechange',stateChanged);registrationRef.current?.removeEventListener('updatefound',updateFound);navigator.serviceWorker.removeEventListener('controllerchange',changed);};
 },[]);
 function updateServiceWorker(){const worker=registrationRef.current?.waiting;if(!worker)return;reloadRef.current=true;worker.postMessage({type:'SKIP_WAITING'});}
 return {needRefresh,setNeedRefresh,offlineReady,setOfflineReady,updateServiceWorker};
}
