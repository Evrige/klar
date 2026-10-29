let owner = 'guest';
export const setStorageOwner = (value: string) => { owner = value; };
export const storageOwner = () => owner;
export const storageKey = (key: string) => owner === 'guest' ? key : `klar:account:${owner}:${key}`;
export const legacyKeys = ['klar:locale:v1', 'klar:dark', 'klar:mastered:v1', 'klar:vocabulary:v1', 'klar:nouns:v1', 'klar:sentences:v1', 'klar:daily:v1', 'klar:course:v1', 'klar:activity:v1', 'klar:achievements:v1', 'klar:xp:v1', 'klar:learning:v1', 'klar:phrases:v1', 'klar:learning:word-mode', 'klar:vocabulary:levels:v1', 'klar:verb-level:v1', 'klar:verb-practice:length:v1', 'klar:speech:voice', 'klar:speech:rate'] as const;
export function localSnapshot(guest = false) { return Object.fromEntries(legacyKeys.flatMap(key => { try {
    const raw = localStorage.getItem(guest ? key : storageKey(key));
    return raw === null ? [] : [[key, JSON.parse(raw)]];
}
catch {
    return [];
} })); }
export function cacheSnapshot(snapshot: Record<string, unknown>) { for (const key of legacyKeys)
    if (key in snapshot)
        localStorage.setItem(storageKey(key), JSON.stringify(snapshot[key])); }
export function deviceId() { let value = localStorage.getItem('klar:device:v1'); if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem('klar:device:v1', value);
} return value; }
export type QueuedEvent = {
    kind: 'attempt' | 'step' | 'snapshot' | 'status' | 'note' | 'settings';
    clientEventId: string;
    occurredAt: number;
    payload: unknown;
    attempted?:boolean;
};
const queueKey = () => storageKey('outbox:v1');
const inFlight=new Map<string,number>();
export function protectBatch(ids:string[]){const prefix=owner+':';for(const id of ids){const key=prefix+id;inFlight.set(key,(inFlight.get(key)??0)+1);}return ()=>{for(const id of ids){const key=prefix+id,count=inFlight.get(key)??1;if(count===1)inFlight.delete(key);else inFlight.set(key,count-1);}};}
export function outbox(): QueuedEvent[] { try {
    const v = JSON.parse(localStorage.getItem(queueKey()) ?? '[]');
    return Array.isArray(v) ? v : [];
}
catch {
    throw new Error('Очередь синхронизации повреждена. Экспортируйте локальную копию.');
} }
function editKey(kind:QueuedEvent['kind'],payload:unknown):string|null {
    const p=payload as {wordId?:string;lessonId?:string};
    return kind==='status'?'status:'+p.wordId:kind==='note'?'note:'+p.lessonId:kind==='settings'?'settings':null;
}
export function markAttempted(ids:string[]){localStorage.setItem(queueKey(),JSON.stringify(outbox().map(e=>ids.includes(e.clientEventId)?{...e,attempted:true}:e)));}
export function enqueue(kind:QueuedEvent['kind'],payload:unknown,clientEventId=crypto.randomUUID()):QueuedEvent|null {
    if(owner==='guest')return null;
    const normalSnapshot=kind==='snapshot'&&!!payload&&typeof payload==='object'&&!('klar:learning:v1'in payload);
    let queue=outbox().filter(e=>!normalSnapshot||e.kind!=='snapshot'||!!(e.payload&&typeof e.payload==='object'&&'klar:learning:v1'in e.payload)||inFlight.has(owner+':'+e.clientEventId));
    const target=editKey(kind,payload);
    if(target){
        let lastAttempted=-1;queue.forEach((e,i)=>{if(editKey(e.kind,e.payload)===target&&(e.attempted||inFlight.has(owner+':'+e.clientEventId)))lastAttempted=i;});
        const first=queue.find((e,i)=>i>lastAttempted&&editKey(e.kind,e.payload)===target);
        if(first){
            const before=first.payload as {revision:number;baseToken:string;values?:Record<string,unknown>};
            const incoming=payload as {values?:Record<string,unknown>};
            let values:Record<string,unknown>={};
            for(const [i,e]of queue.entries())if(i>lastAttempted&&editKey(e.kind,e.payload)===target)values={...values,...(e.payload as {values?:Record<string,unknown>}).values};
            payload={...payload as object,revision:before.revision,baseToken:before.baseToken,...(kind==='settings'?{values:{...values,...incoming.values}}:{})};
            queue=queue.filter((e,i)=>i<=lastAttempted||editKey(e.kind,e.payload)!==target);
        }
    }
    if(queue.length>=5000)throw new Error('Очередь заполнена. Подключитесь к сети и сохраните экспорт.');
    const event={kind,payload,clientEventId,occurredAt:Date.now()};queue.push(event);localStorage.setItem(queueKey(),JSON.stringify(queue));window.dispatchEvent(new Event('klar:outbox'));return event;
}
export function queueStorageChange(key: string, previous: string | null, value: unknown) {
    if (owner === 'guest' || previous === null)
        return;
    const revisionsKey = storageKey('revisions:v1'), revisions = JSON.parse(localStorage.getItem(revisionsKey) ?? '{"statuses":{},"notes":{},"settings":0}');
    const old = JSON.parse(previous);
    revisions.statusTokens??={};revisions.noteTokens??={};revisions.settingsToken??='';
    if (key === 'klar:vocabulary:v1')
        for (const [wordId, status] of Object.entries(value as Record<string, string>))
            if (old[wordId] !== status) {
                const revision = revisions.statuses[wordId] ?? 0;
                const id=crypto.randomUUID(),event=enqueue('status', { wordId, status, revision,baseToken:revisions.statusTokens[wordId]??'' },id);revisions.statusTokens[wordId]=`${deviceId()}:${id}`;
                revisions.statuses[wordId] = (event?.payload as {revision:number}).revision + 1;
            }
    if (key === 'klar:course:v1')
        for (const [lessonId, row] of Object.entries(value as Record<string, {
            note: string;
        }>))
            if (old[lessonId]?.note !== row.note) {
                const revision = revisions.notes[lessonId] ?? 0;
                const id=crypto.randomUUID(),event=enqueue('note', { lessonId, note: row.note, revision,baseToken:revisions.noteTokens[lessonId]??'' },id);revisions.noteTokens[lessonId]=`${deviceId()}:${id}`;
                revisions.notes[lessonId] = (event?.payload as {revision:number}).revision + 1;
            }
    if (['klar:locale:v1', 'klar:dark', 'klar:speech:rate', 'klar:learning:word-mode', 'klar:vocabulary:levels:v1', 'klar:verb-level:v1', 'klar:verb-practice:length:v1'].includes(key)) {
        const id=crypto.randomUUID(),event=enqueue('settings', { revision: revisions.settings,baseToken:revisions.settingsToken, values: { [key]: value } },id);revisions.settingsToken=`${deviceId()}:${id}`;
        revisions.settings=(event?.payload as {revision:number}).revision+1;
    }
    localStorage.setItem(revisionsKey, JSON.stringify(revisions));
}
export function acknowledge(ids: string[]) { localStorage.setItem(queueKey(), JSON.stringify(outbox().filter(e => !ids.includes(e.clientEventId)))); }
let snapshotTimer: ReturnType<typeof setTimeout> | undefined;
export function markSnapshotDirty() { if (owner !== 'guest')
    localStorage.setItem(storageKey('snapshot-dirty:v1'), '1'); }
export function recoverDirtySnapshot() { if (owner === 'guest' || !localStorage.getItem(storageKey('snapshot-dirty:v1')))
    return; const snapshot = localSnapshot(); delete snapshot['klar:learning:v1']; enqueue('snapshot', snapshot); localStorage.removeItem(storageKey('snapshot-dirty:v1')); }
export function scheduleSnapshot() { if (owner === 'guest')
    return; const expectedOwner = owner; clearTimeout(snapshotTimer); snapshotTimer = setTimeout(() => { if (owner !== expectedOwner)
    return; try {
    recoverDirtySnapshot();
}
catch (error) {
    window.dispatchEvent(new CustomEvent('klar:sync-error', { detail: error instanceof Error ? error.message : 'Сбой очереди' }));
} }, 1000); }
