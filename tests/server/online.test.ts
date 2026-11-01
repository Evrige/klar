import 'dotenv/config';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw new Error('Online tests require local klar_test');
process.env.DATABASE_URL=url;process.env.DATABASE_ADAPTER='pg';
const {db}=await import('../../server/db.ts');
const {competitionLobby,getQueue,joinQueue,cancelQueue,getMatch,submitRound,leaveMatch,leaderboard}=await import('../../server/competition.ts');
const users:string[]=[];
after(async()=>{await db.user.deleteMany({where:{id:{in:users}}});await db.$disconnect();});
async function fixture(ranked=false){
    const id=randomUUID(),a=`online-a-${id}`,b=`online-b-${id}`,c=`online-c-${id}`;users.push(a,b,c);
    await db.user.createMany({data:[a,b,c].map((id,index)=>({id,email:`${id}@example.invalid`,name:`Learner ${index+1}`}))});
    const season=await db.season.create({data:{id:`online-${id}`,startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+600000)}});
    const q={seasonId:season.id,mode:'WORD_CHOICE_RACE' as const,level:'A1' as const,ranked};
    return {a,b,c,q};
}
test('lobby and queue expose only own search; expiry and cancellation are recoverable',async()=>{
    const {a,b,q}=await fixture();const lobby=await competitionLobby(a);
    assert.ok(lobby.seasons.some(s=>s.id===q.seasonId));assert.equal(lobby.queue,null);
    await joinQueue(a,q);assert.equal((await getQueue(a))?.status,'WAITING');assert.equal(await getQueue(b),null);
    assert.equal((await cancelQueue(a)).cancelled,true);assert.equal(await getQueue(a),null);
    const waiting=await joinQueue(a,q);assert.ok('queueId' in waiting);
    await db.queueEntry.updateMany({where:{userId:a,status:'WAITING'},data:{expiresAt:new Date(Date.now()-1)}});
    assert.equal(await getQueue(a),null);
    assert.equal((await db.queueEntry.findFirstOrThrow({where:{id:waiting.queueId}})).status,'EXPIRED');
});
test('concurrent cancellation and matchmaking cannot silently strand the cancelling player',async()=>{
    const {a,b,q}=await fixture();await joinQueue(a,q);
    const [cancelled,joined]=await Promise.all([cancelQueue(a),joinQueue(b,q)]);
    if('matchId' in joined){assert.equal(cancelled.matchId,joined.matchId);await leaveMatch(a,joined.matchId!);}
    else{assert.equal(cancelled.cancelled,true);assert.equal(await getQueue(a),null);await cancelQueue(b);}
});
test('reconnect restores only own final answer and rating result; leaderboard uses registration names',async()=>{
    const {a,b,c,q}=await fixture(true);await joinQueue(a,q);const joined=await joinQueue(b,q);assert.ok('matchId' in joined);const id=joined.matchId!;
    const hidden=await getMatch(a,id);assert.equal(hidden.rounds[0].question,undefined);assert.equal(hidden.participants.filter(p=>p.isYou).length,1);assert.ok(hidden.participants.every(p=>!('userId' in p)&&!('email' in p)));await assert.rejects(getMatch(c,id));
    await db.matchRound.updateMany({where:{matchId:id},data:{startsAt:new Date(Date.now()-1000)}});
    const state=await getMatch(a,id),round=state.rounds[0],version=await db.matchRound.findUniqueOrThrow({where:{id:round.id},include:{version:{include:{answers:true}}}});
    const choices=(round.question as {choices:{id:string;text:string}[]}).choices,correct=choices.find(choice=>choice.text===version.version.answers[0].answer)!,wrong=choices.find(choice=>choice.id!==correct.id)!;
    const input={roundId:round.id,token:round.token!,requestId:randomUUID(),answer:wrong.id};await submitRound(a,input);await submitRound(a,input);
    const reconnect=await getMatch(a,id);assert.equal(reconnect.submissions.length,1);assert.equal(reconnect.submissions[0].answer,wrong.id);assert.equal(reconnect.rounds[0].answers,undefined);assert.equal((await getMatch(b,id)).submissions.length,0);
    assert.equal((await cancelQueue(a)).matchId,id);
    await submitRound(b,{roundId:round.id,token:round.token!,requestId:randomUUID(),answer:correct.id});
    const finished=await getMatch(a,id);assert.equal(finished.current.status,'FINISHED');assert.equal(finished.ratingChanges.length,2);assert.ok(finished.rounds[0].answers?.length);assert.equal(await getQueue(a),null);
    assert.equal((await leaderboard(q.seasonId,q.mode,q.level)).length,0);
    await db.rating.updateMany({where:{seasonId:q.seasonId},data:{games:5}});
    const leaders=await leaderboard(q.seasonId,q.mode,q.level);assert.equal(leaders.length,2);assert.equal(leaders[0].name,'Learner 2');assert.ok(leaders.every(entry=>!('user' in entry)&&!('email' in entry)&&!('userId' in entry)));
});
test('leaving after deadline does not invent a win and expired matches do not block another search',async()=>{
    const {a,b,q}=await fixture();await joinQueue(a,q);const joined=await joinQueue(b,q);assert.ok('matchId' in joined);const id=joined.matchId!;
    await db.match.update({where:{id},data:{deadlineAt:new Date(Date.now()-1)}});await db.matchRound.updateMany({where:{matchId:id},data:{deadlineAt:new Date(Date.now()-1),startsAt:new Date(Date.now()-1000)}});
    await leaveMatch(a,id);const done=await getMatch(b,id);assert.equal(done.current.reason,'deadline');assert.ok(done.participants.every(p=>p.score===0));
    const next=await joinQueue(a,q);assert.ok('queueId' in next);await cancelQueue(a);
});

test('HTTP lobby and duel APIs authenticate players, reject forged identity and preserve answer replay',async()=>{
    const {a,b,c,q}=await fixture(),{createLocalServer}=await import('../../server/dev.ts'),{serializeSignedCookie}=await import('better-call');
    const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const root=`http://127.0.0.1:${(server.address() as {port:number}).port}/api`,origin=process.env.BETTER_AUTH_URL!;
    async function headers(id:string){const token=randomUUID();await db.session.create({data:{id:randomUUID(),userId:id,token,expiresAt:new Date(Date.now()+60000)}});return {cookie:(await serializeSignedCookie('better-auth.session_token',token,process.env.BETTER_AUTH_SECRET!,{path:'/'})).split(';')[0],origin,'content-type':'application/json','x-forwarded-for':'127.0.0.249'};}
    try{
        const ha=await headers(a),hb=await headers(b),hc=await headers(c);
        assert.equal((await fetch(root+'/competition/lobby')).status,401);
        const lobby=await fetch(root+'/competition/lobby',{headers:ha});assert.equal(lobby.status,200);assert.match(lobby.headers.get('cache-control')??'',/no-store/);
        const forged=await fetch(root+'/competition/queue',{method:'POST',headers:ha,body:JSON.stringify({...q,userId:b})});assert.equal(forged.status,400);
        assert.equal((await fetch(root+'/competition/queue',{method:'POST',headers:ha,body:JSON.stringify(q)})).status,200);
        const join=await fetch(root+'/competition/queue',{method:'POST',headers:hb,body:JSON.stringify(q)});assert.equal(join.status,200);const {matchId}=await join.json();
        assert.equal((await fetch(root+`/competition/match?id=${matchId}`,{headers:hc})).status,403);
        await db.matchRound.updateMany({where:{matchId},data:{startsAt:new Date(Date.now()-1000)}});
        const state=await (await fetch(root+`/competition/match?id=${matchId}`,{headers:ha})).json(),round=state.rounds[0];
        const input={roundId:round.id,token:round.token,requestId:randomUUID(),answer:round.question.choices[0].id};
        assert.equal((await fetch(root+'/competition/submit',{method:'POST',headers:ha,body:JSON.stringify({...input,correct:true,score:999})})).status,400);
        const first=await fetch(root+'/competition/submit',{method:'POST',headers:ha,body:JSON.stringify(input)}),second=await fetch(root+'/competition/submit',{method:'POST',headers:ha,body:JSON.stringify(input)});
        assert.equal(first.status,200);assert.equal(second.status,200);assert.equal((await first.json()).id,(await second.json()).id);
        await leaveMatch(b,matchId);
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
