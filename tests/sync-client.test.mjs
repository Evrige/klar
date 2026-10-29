import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {setStorageOwner,storageKey,cacheSnapshot,localSnapshot,enqueue,outbox,acknowledge,markSnapshotDirty,recoverDirtySnapshot,queueStorageChange,deviceId,protectBatch,markAttempted} from '../src/sync/storage.ts';
import {sendBatch,pendingBatch} from '../src/sync/client.ts';
class MemoryStorage {
  data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}
}
beforeEach(()=>{globalThis.localStorage=new MemoryStorage();globalThis.window=new EventTarget();Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});setStorageOwner('guest');});
test('guest keys and each account cache/outbox have separate owners',()=>{
  localStorage.setItem('klar:xp:v1','70');setStorageOwner('a');cacheSnapshot({'klar:xp:v1':100});enqueue('step',{lessonId:'l',stepId:'s'});setStorageOwner('b');assert.equal(outbox().length,0);assert.equal(localSnapshot()['klar:xp:v1'],undefined);acknowledge(['unknown']);setStorageOwner('a');assert.equal(outbox().length,1);assert.equal(localSnapshot()['klar:xp:v1'],100);setStorageOwner('guest');assert.equal(localSnapshot()['klar:xp:v1'],70);
});
test('dirty snapshot recovers after closing before the scheduled send and keeps learning events separate',()=>{
  setStorageOwner('a');cacheSnapshot({'klar:vocabulary:v1':{hallo:'known'},'klar:learning:v1':{version:1}});markSnapshotDirty();recoverDirtySnapshot();recoverDirtySnapshot();assert.equal(outbox().length,1);assert.deepEqual(outbox()[0].payload['klar:vocabulary:v1'],{hallo:'known'});assert.equal(outbox()[0].payload['klar:learning:v1'],undefined);assert.equal(localStorage.getItem(storageKey('snapshot-dirty:v1')),null);
});
test('speculative edits carry predecessor tokens instead of trusting incremented revisions alone',()=>{
  setStorageOwner('a');queueStorageChange('klar:vocabulary:v1','{}',{hallo:'known'});markAttempted([outbox()[0].clientEventId]);queueStorageChange('klar:vocabulary:v1','{"hallo":"known"}',{hallo:'learning'});const [first,next]=outbox();assert.equal(first.payload.baseToken,'');assert.equal(next.payload.baseToken,`${deviceId()}:${first.clientEventId}`);assert.equal(next.payload.revision,1);
});
test('batch byte budget prevents bundling multiple large snapshots above the API limit',()=>{
  setStorageOwner('a');enqueue('snapshot',{value:'x'.repeat(1100000)});const release=protectBatch([outbox()[0].clientEventId]);enqueue('snapshot',{value:'x'.repeat(1100000)});assert.equal(pendingBatch().length,1);assert.equal(outbox().length,2);release();
});
test('failed request retains all events and successful ack removes only returned IDs',async()=>{
  setStorageOwner('a');enqueue('step',{lessonId:'l',stepId:'s'});const id=outbox()[0].clientEventId;globalThis.fetch=async()=>{throw new Error('offline');};await assert.rejects(sendBatch());assert.equal(outbox().length,1);
  globalThis.fetch=async(_url,options)=>{assert.equal(options.headers['X-Klar-Owner'],'a');return Response.json({results:[{clientEventId:id,result:{accepted:true}}],snapshot:{},revisions:{}});};await sendBatch();assert.equal(outbox().length,0);
});
test('a response arriving after account switch cannot acknowledge another owner queue',async()=>{
  setStorageOwner('a');enqueue('step',{lessonId:'l',stepId:'s'});const id=outbox()[0].clientEventId;let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);const sending=sendBatch();setStorageOwner('b');enqueue('step',{lessonId:'b',stepId:'b'});resolve(Response.json({results:[{clientEventId:id,result:{accepted:true}}],revisions:{}}));assert.equal(await sending,null);assert.equal(outbox().length,1);setStorageOwner('a');assert.equal(outbox().length,1);
});
test('conflicts retain the original incoming payload before acknowledged events leave the outbox',async()=>{
  setStorageOwner('a');enqueue('note',{lessonId:'l',note:'my offline note',revision:0,baseToken:''});const id=outbox()[0].clientEventId;globalThis.fetch=async()=>Response.json({results:[{clientEventId:id,result:{conflict:true,current:{revision:1,changeToken:'other'}}}],revisions:{}});await sendBatch();const reports=JSON.parse(localStorage.getItem(storageKey('sync-conflicts:v1')));assert.equal(reports[0].event.payload.note,'my offline note');assert.equal(outbox().length,0);
});
test('offline snapshots coalesce without dropping attempts, restored learning or in-flight snapshots',()=>{
  setStorageOwner('a');enqueue('snapshot',{'klar:xp:v1':1});const first=outbox()[0].clientEventId,release=protectBatch([first]);enqueue('attempt',{answer:'a'});enqueue('snapshot',{'klar:learning:v1':{version:1}});enqueue('snapshot',{'klar:xp:v1':2});enqueue('snapshot',{'klar:xp:v1':3});assert.equal(outbox().length,4);assert(outbox().some(e=>e.clientEventId===first));release();enqueue('snapshot',{'klar:xp:v1':4});assert.equal(outbox().length,3);assert.equal(outbox().at(-1).payload['klar:xp:v1'],4);
});
test('offline note typing coalesces only unsent revisions and keeps the original server base',()=>{
  setStorageOwner('a');let old={};for(let n=1;n<=1000;n++){const next={lesson:{note:'x'.repeat(n)}};queueStorageChange('klar:course:v1',JSON.stringify(old),next);old=next;}assert.equal(outbox().length,1);assert.equal(outbox()[0].payload.note.length,1000);assert.equal(outbox()[0].payload.revision,0);assert.equal(outbox()[0].payload.baseToken,'');
});
test('an event attempted before a lost response is immutable when a newer note is queued',async()=>{
  setStorageOwner('a');queueStorageChange('klar:course:v1','{}',{lesson:{note:'first'}});const first=outbox()[0];globalThis.fetch=async()=>{throw new Error('lost response');};await assert.rejects(sendBatch());queueStorageChange('klar:course:v1','{"lesson":{"note":"first"}}',{lesson:{note:'second'}});assert.equal(outbox().length,2);assert.equal(outbox()[0].clientEventId,first.clientEventId);assert.equal(outbox()[0].payload.note,'first');assert.equal(outbox()[1].payload.baseToken,`${deviceId()}:${first.clientEventId}`);
});
