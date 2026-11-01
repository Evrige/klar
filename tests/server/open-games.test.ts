import 'dotenv/config';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw Error('Local test DB required');
process.env.DATABASE_URL=url;process.env.DATABASE_ADAPTER='pg';
const {db}=await import('../../server/db.ts');
const {joinQueue,openGames,getQueue,cancelQueue}=await import('../../server/competition.ts');
const users:string[]=[];
after(async()=>{await db.user.deleteMany({where:{id:{in:users}}});await db.$disconnect();});
async function fixture(){const ids=[randomUUID(),randomUUID(),randomUUID()];users.push(...ids);await db.user.createMany({data:ids.map((id,index)=>({id,email:`${id}@example.invalid`,name:`Room player ${index}`}))});const season=await db.season.create({data:{id:randomUUID(),startsAt:new Date(Date.now()-1000),endsAt:new Date(Date.now()+3600000)}});const q={seasonId:season.id,mode:'WORD_CHOICE_RACE',level:'A1',ranked:false,scoring:'SPEED',questionCount:5,searchType:'ROOM'};return {a:ids[0],b:ids[1],c:ids[2],q};}
test('open rooms require explicit choice, hide private identity and isolate auto queue',async()=>{
 const {a,b,c,q}=await fixture();const created=await joinQueue(a,q);assert.ok(created.queueId);assert.ok(new Date(created.expiresAt!).getTime()>Date.now()+500000);
 assert.ok(!(await openGames(a)).some(r=>r.id===created.queueId));const room=(await openGames(b)).find(r=>r.id===created.queueId)!;assert.ok(room);assert.equal(room.name,'Room player 0');assert.ok(!('userId' in room)&&!('email' in room)&&!('user' in room));
 const auto=await joinQueue(c,{...q,searchType:'AUTO'});assert.ok(auto.queueId);assert.equal((await getQueue(a))?.status,'WAITING');await cancelQueue(c);
 const joined=await joinQueue(b,{...q,targetQueueId:created.queueId});assert.ok(joined.matchId);assert.equal((await getQueue(a))?.matchId,joined.matchId);assert.ok(!(await openGames(c)).some(r=>r.id===created.queueId));
});
test('two players competing for one room cannot both join, expired and mismatched rooms reject',async()=>{
 const {a,b,c,q}=await fixture();const created=await joinQueue(a,q);const result=await Promise.allSettled([joinQueue(b,{...q,targetQueueId:created.queueId}),joinQueue(c,{...q,targetQueueId:created.queueId})]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(await db.match.count({where:{seasonId:q.seasonId}}),1);
 const other=await fixture();const waiting=await joinQueue(other.a,other.q);await assert.rejects(joinQueue(other.b,{...other.q,questionCount:10,targetQueueId:waiting.queueId}),/Room unavailable/);
 await db.queueEntry.update({where:{id:waiting.queueId},data:{expiresAt:new Date(Date.now()-1)}});await assert.rejects(joinQueue(other.b,{...other.q,targetQueueId:waiting.queueId}),/Room unavailable/);
});
