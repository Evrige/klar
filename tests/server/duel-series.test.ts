import 'dotenv/config';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw new Error('Series tests require local klar_test');
process.env.DATABASE_URL=url;process.env.DATABASE_ADAPTER='pg';
const {db}=await import('../../server/db.ts');
const {joinQueue,cancelQueue,getMatch,submitRound,leaveMatch,expireMatches,leaderboard}=await import('../../server/competition.ts');
const users:string[]=[];
after(async()=>{await db.user.deleteMany({where:{id:{in:users}}});await db.$disconnect();});
async function fixture(scoring:'SPEED'|'ACCURACY',questionCount:5|10|15|20,ranked=false){
    const suffix=randomUUID(),a=`series-a-${suffix}`,b=`series-b-${suffix}`,c=`series-c-${suffix}`;users.push(a,b,c);
    await db.user.createMany({data:[a,b,c].map((id,index)=>({id,name:`Player ${index+1}`,email:`${id}@example.invalid`}))});
    const seasonId=`series-${suffix}`;await db.season.create({data:{id:seasonId,startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+3600000)}});
    const q={seasonId,mode:'WORD_CHOICE_RACE' as const,level:'A1' as const,ranked,scoring,questionCount};return {a,b,c,q};
}
async function join(f:Awaited<ReturnType<typeof fixture>>){await joinQueue(f.a,f.q);const result=await joinQueue(f.b,f.q);assert.ok('matchId' in result&&result.matchId);return result.matchId;}
async function ready(a:string,matchId:string){
    const row=await db.matchRound.findFirstOrThrow({where:{matchId},orderBy:{number:'desc'},include:{version:{include:{answers:true}}}});
    await db.matchRound.update({where:{id:row.id},data:{startsAt:new Date(Date.now()-1000)}});
    const state=await getMatch(a,matchId),round=state.rounds.at(-1)!;
    const choices=(round.question as {choices:{id:string;text:string}[]}).choices;
    const correct=choices.find(choice=>row.version.answers.some(answer=>answer.answer===choice.text))!;
    const wrong=choices.find(choice=>choice.id!==correct.id)!;
    return {round,correct:correct.id,wrong:wrong.id,exerciseId:row.version.exerciseId};
}
test('matchmaking separates 5/10 questions and speed/accuracy rules',async()=>{
    const f=await fixture('SPEED',5);const a=await joinQueue(f.a,f.q),b=await joinQueue(f.b,{...f.q,scoring:'ACCURACY'}),c=await joinQueue(f.c,{...f.q,questionCount:10});
    assert.ok('queueId' in a&&'queueId' in b&&'queueId' in c);assert.equal(await db.match.count({where:{seasonId:f.q.seasonId}}),0);
    await Promise.all([f.a,f.b,f.c].map(cancelQueue));
});
test('speed: first wrong answer gives opponent one point, replay and concurrent responses cannot double-score',async()=>{
    const f=await fixture('SPEED',5),id=await join(f),r=await ready(f.a,id);
    const input={roundId:r.round.id,token:r.round.token!,requestId:randomUUID(),answer:r.wrong};
    const first=await submitRound(f.a,input),retry=await submitRound(f.a,input);assert.ok('id' in first&&'id' in retry);assert.equal(first.id,retry.id);
    let state=await getMatch(f.a,id);assert.equal(state.current.status,'ACTIVE');assert.equal(state.participants.find(p=>p.isYou)!.score,0);assert.equal(state.participants.find(p=>!p.isYou)!.score,1);assert.equal(state.rounds.length,2);assert.equal(state.rounds.at(-1)!.question,undefined);assert.equal(state.rounds[0].reason,'first-incorrect');
    const next=await ready(f.a,id);await Promise.all([f.a,f.b].map(userId=>submitRound(userId,{roundId:next.round.id,token:next.round.token!,requestId:randomUUID(),answer:next.correct})));
    state=await getMatch(f.a,id);assert.equal(state.participants.reduce((count,p)=>count+p.score,0),2);assert.equal(state.rounds.length,3);await leaveMatch(f.a,id);
});
test('accuracy: both players can score; Elo is applied once after all five questions and isolated by rules',async()=>{
    const f=await fixture('ACCURACY',5,true),id=await join(f);
    for(let index=0;index<5;index++){
        const r=await ready(f.a,id),input={roundId:r.round.id,token:r.round.token!,requestId:randomUUID(),answer:r.correct};
        await submitRound(f.a,input);await submitRound(f.a,input);
        let state=await getMatch(f.a,id);assert.equal(state.rounds.length,index+1);assert.equal(state.current.status,'ACTIVE');assert.equal(await db.ratingHistory.count({where:{matchId:id}}),0);
        assert.equal(state.participants.find(p=>p.isYou)!.score,index+1);
        await submitRound(f.b,{...input,requestId:randomUUID()});
    }
    const done=await getMatch(f.a,id);assert.equal(done.current.status,'FINISHED');assert.ok(done.participants.every(p=>p.score===5));assert.equal(done.rounds.length,5);assert.equal(done.ratingChanges.length,2);
    await getMatch(f.b,id);await expireMatches();assert.equal(await db.ratingHistory.count({where:{matchId:id}}),2);
    const ratings=await db.rating.findMany({where:{seasonId:f.q.seasonId}});assert.ok(ratings.every(r=>r.scoring==='ACCURACY'&&r.games===1&&r.value===1000));
    await db.rating.updateMany({where:{seasonId:f.q.seasonId},data:{games:5}});assert.equal((await leaderboard(f.q.seasonId,f.q.mode,f.q.level,'ACCURACY')).length,2);assert.equal((await leaderboard(f.q.seasonId,f.q.mode,f.q.level,'SPEED')).length,0);
});
for(const count of [10,15,20] as const)test(`speed series completes exactly ${count} distinct words`,async()=>{
    const f=await fixture('SPEED',count),id=await join(f),seen=new Set<string>();
    for(let index=0;index<count;index++){
        const r=await ready(f.a,id);assert.ok(!seen.has(r.exerciseId));seen.add(r.exerciseId);
        await submitRound(f.a,{roundId:r.round.id,token:r.round.token!,requestId:randomUUID(),answer:r.correct});
    }
    const done=await getMatch(f.a,id);assert.equal(done.current.status,'FINISHED');assert.equal(done.current.questionCount,count);assert.equal(done.rounds.length,count);assert.equal(done.participants.find(p=>p.isYou)!.score,count);assert.equal(done.participants.find(p=>!p.isYou)!.score,0);
});
test('abandoned series catches up persisted deadlines and finishes without invented points',async()=>{
    const f=await fixture('ACCURACY',5),id=await join(f),deadlineAt=new Date(Date.now()-3600000);
    await db.match.update({where:{id},data:{deadlineAt}});await db.matchRound.updateMany({where:{matchId:id},data:{startsAt:new Date(deadlineAt.getTime()-30000),deadlineAt}});
    const result=await getMatch(f.a,id);assert.equal(result.current.status,'FINISHED');assert.equal(result.rounds.length,5);assert.ok(result.rounds.every(r=>r.status==='EXPIRED'));assert.ok(result.participants.every(p=>p.score===0));
});
test('leaving a series while leading still forfeits the match and the rating',async()=>{
    const f=await fixture('SPEED',5,true),id=await join(f);
    for(let index=0;index<4;index++){const r=await ready(f.a,id);await submitRound(f.a,{roundId:r.round.id,token:r.round.token!,requestId:randomUUID(),answer:r.correct});}
    await leaveMatch(f.a,id);const done=await getMatch(f.a,id);assert.equal(done.current.status,'FINISHED');assert.equal(done.current.reason,'opponent-left');assert.ok(done.participants.find(p=>!p.isYou)!.score>done.participants.find(p=>p.isYou)!.score);assert.ok(done.ratingChanges.find(r=>r.seat===done.participants.find(p=>p.isYou)!.seat)!.after<1000);
});
