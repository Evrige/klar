import {acknowledge,outbox,deviceId,storageOwner,storageKey,protectBatch,markAttempted,type QueuedEvent} from './storage.ts';
export type SyncStatus='synced'|'conflict'|'offline'|'reauth'|'invalid'|'account-changed'|'retry';
export type SyncConflict={clientEventId:string;event?:QueuedEvent;result:{conflict?:boolean;current?:{revision:number;changeToken:string};conflicts?:{kind:string;key:string;resolution:string}[]}};
export type SyncResponse={results:SyncConflict[];snapshot:Record<string,unknown>;revisions:unknown};
export async function api<T=Record<string,unknown>>(path:string,method='GET',body?:unknown):Promise<T>{
  const owner=storageOwner(),headers:Record<string,string>={};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(owner!=='guest')headers['X-Klar-Owner']=owner;
  const response=await fetch(`/api/${path}`,{method,credentials:'same-origin',cache:'no-store',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw Object.assign(new Error(data.error==='ACCOUNT_CHANGED'?'ACCOUNT_CHANGED':`HTTP_${response.status}`),{status:response.status,code:typeof data.code==='string'?data.code:typeof data.error==='string'?data.error:undefined});}
  return response.json();
}
export function pendingBatch():QueuedEvent[]{
  const batch:QueuedEvent[]=[];
  for(const event of outbox().slice(0,50)){
    const candidate=[...batch,event];
    if(new TextEncoder().encode(JSON.stringify({deviceId:deviceId(),events:candidate})).byteLength>1900000){if(!batch.length)throw Object.assign(new Error('HTTP_413'),{status:413});break;}
    batch.push(event);
  }
  return batch;
}
export async function sendBatch():Promise<SyncResponse|null>{
  const owner=storageOwner(),batch=pendingBatch();if(!batch.length)return null;
  markAttempted(batch.map(e=>e.clientEventId));
  const release=protectBatch(batch.map(e=>e.clientEventId));
  let response:SyncResponse;
  try{response=await api<SyncResponse>('sync','POST',{deviceId:deviceId(),events:batch.map(({attempted:_attempted,...event})=>event)});}finally{release();}
  if(owner!==storageOwner())return null;
  const conflicts=response.results.filter(r=>r.result.conflict||r.result.conflicts?.length);
  if(conflicts.length){const key=storageKey('sync-conflicts:v1'),previous=JSON.parse(localStorage.getItem(key)??'[]') as SyncConflict[];const ids=new Set(previous.map(c=>c.clientEventId));localStorage.setItem(key,JSON.stringify([...previous,...conflicts.filter(c=>!ids.has(c.clientEventId)).map(c=>({...c,event:batch.find(e=>e.clientEventId===c.clientEventId)}))]));}
  acknowledge(response.results.map(r=>r.clientEventId));
  if(!outbox().length)localStorage.setItem(storageKey('revisions:v1'),JSON.stringify(response.revisions));
  window.dispatchEvent(new Event('klar:sync-updated'));
  return response;
}
export function startSync(onStatus:(status:SyncStatus)=>void){
  let stopped=false,running=false,retry=1000,timer:ReturnType<typeof setTimeout>|undefined;
  const owner=storageOwner();
  async function flush(){
    if(stopped||running||owner!==storageOwner()||!navigator.onLine)return;
    running=true;
    try{
      const result=await sendBatch();if(stopped||owner!==storageOwner()||!result)return;
      retry=1000;onStatus(result.results.some(r=>r.result.conflict||r.result.conflicts?.length)?'conflict':'synced');
      if(outbox().length)timer=setTimeout(flush,200);
    }catch(error){
      if(stopped||owner!==storageOwner())return;
      const e=error as {status?:number;message?:string};
      if(e.status===401){onStatus('reauth');return;}
      if(e.message==='ACCOUNT_CHANGED'){onStatus('account-changed');return;}
      if(e.status===400||e.status===413){onStatus('invalid');return;}
      onStatus(navigator.onLine?'retry':'offline');retry=Math.min(60000,retry*2);timer=setTimeout(flush,retry+Math.random()*500);
    }finally{running=false;}
  }
  const wake=()=>{clearTimeout(timer);timer=setTimeout(flush,500);};
  const storage=(event:StorageEvent)=>{if(event.key==='klar:account-locked'&&event.newValue==='1'){stopped=true;clearTimeout(timer);onStatus('reauth');window.dispatchEvent(new Event('klar:remote-logout'));}};
  window.addEventListener('online',wake);window.addEventListener('klar:outbox',wake);window.addEventListener('storage',storage);void flush();
  return ()=>{stopped=true;clearTimeout(timer);window.removeEventListener('online',wake);window.removeEventListener('klar:outbox',wake);window.removeEventListener('storage',storage);};
}
export interface CompetitionTransport{read(matchId:string,after:string):Promise<{events:{sequence:string}[];current?:{status:string}}>;submit(payload:unknown):Promise<unknown>;}
export const pollingTransport:CompetitionTransport={read:(id,after)=>api(`competition/match?id=${encodeURIComponent(id)}&after=${after}`),submit:payload=>api('competition/submit','POST',payload)};
export function pollRoom(transport:CompetitionTransport,id:string,onUpdate:(data:unknown)=>void){
  let stopped=false,after='0',timer:ReturnType<typeof setTimeout>|undefined;
  async function poll(){try{const result=await transport.read(id,after);if(stopped)return;onUpdate(result);after=result.events.at(-1)?.sequence??after;if(['FINISHED','CANCELLED'].includes(result.current?.status??''))stopped=true;}catch{/* resume from the last delivered sequence */}finally{if(!stopped)timer=setTimeout(poll,document.hidden?5000:1500);}}
  void poll();return ()=>{stopped=true;clearTimeout(timer);};
}
