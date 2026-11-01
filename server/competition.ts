import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db, serial, lockUser, type Tx } from './db.ts';
import { hash } from './hash.ts';
import { json } from './import.ts';
import { normalizeSentence } from '../src/data/sentences.ts';
import type { Match, RaceMode } from './generated/prisma/client.ts';
const fail = (message: string, status = 409) => Object.assign(new Error(message), { status });
export const queueSchema = z.object({ seasonId: z.string().min(1).max(200), mode: z.enum(['SENTENCE_RACE', 'WORD_CHOICE_RACE']), level: z.enum(['A1', 'A2', 'B1']), ranked: z.boolean(), scoring:z.enum(['FIRST_CORRECT','SPEED','ACCURACY']).default('FIRST_CORRECT'), questionCount:z.union([z.literal(1),z.literal(5),z.literal(10),z.literal(15),z.literal(20)]).default(1), searchType:z.enum(['AUTO','ROOM']).default('AUTO'), targetQueueId:z.uuid().optional() }).strict();
export const submissionSchema = z.object({ roundId: z.uuid(), token: z.string().max(200), requestId: z.uuid(), answer: z.string().max(2000), clientSentAt: z.iso.datetime().optional() }).strict();
function token(id: string) { const secret = process.env.BETTER_AUTH_SECRET; if (!secret || secret.length < 32)
    throw new Error('Strong BETTER_AUTH_SECRET required'); return createHmac('sha256', secret).update(`round:${id}`).digest('base64url'); }
function shuffle<T>(a: T[]) { const copy = [...a]; for (let i = copy.length - 1; i > 0; i--) {
    const j = Number(BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 12)) % BigInt(i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
} return copy; }
async function now(tx: Tx) { return (await tx.$queryRaw<{
    now: Date;
}[]> `SELECT clock_timestamp() AS now`)[0].now; }
async function matchLock(tx: Tx, id: string) { await tx.$queryRaw `SELECT id FROM "Match" WHERE id=${id} FOR UPDATE`; }
async function scheduleRound(tx:Tx,match:Match,number:number,time:Date,seasonEnd:Date){
    const played=await tx.matchRound.findMany({where:{matchId:match.id},select:{version:{select:{exerciseId:true}}}});
    const versions=await tx.exerciseVersion.findMany({where:{exercise:{domain:match.mode==='SENTENCE_RACE'?'sentence':'word',id:{notIn:played.map(r=>r.version.exerciseId)},...(match.mode==='WORD_CHOICE_RACE'?{level:match.level}:{})}},include:{answers:true},take:250,orderBy:[{createdAt:'desc'},{id:'asc'}]});
    const version=shuffle(versions)[0];if(!version)throw fail('No eligible exercises; seed catalog first');
    let publicData:Record<string,unknown>={prompt:version.prompt};
    if(match.mode==='WORD_CHOICE_RACE'){
        const correct=version.answers[0]?.answer;if(!correct)throw fail('Exercise has no answer');
        const distractors=shuffle(versions.filter(v=>v.exerciseId!==version.exerciseId).flatMap(v=>v.answers.map(a=>a.answer))).filter(value=>!version.answers.some(a=>normalizeSentence(a.answer)===normalizeSentence(value)));
        const choices=shuffle([correct,...new Set(distractors)].slice(0,4)).map(text=>({id:randomUUID(),text}));
        if(choices.length!==4)throw fail('Not enough distinct choices');publicData={prompt:version.prompt,choices};
    }else{
        const tokens=(version.publicData as {tokens?:{text:string}[]}).tokens;if(!tokens)throw fail('Sentence has no token bank');
        publicData.tokens=shuffle(tokens.map(value=>({id:randomUUID(),text:value.text})));
    }
    const startsAt=new Date(time.getTime()+3000),deadlineAt=new Date(Math.min(startsAt.getTime()+30000,seasonEnd.getTime()));
    if(deadlineAt.getTime()-startsAt.getTime()<1000)throw fail('Season ending');
    const id=randomUUID(),round=await tx.matchRound.create({data:{id,matchId:match.id,number,versionId:version.id,tokenHash:hash(token(id)),startsAt,deadlineAt,publicData:json(publicData)}});
    await tx.match.update({where:{id:match.id},data:{deadlineAt}});
    await tx.matchEvent.create({data:{matchId:match.id,kind:'scheduled',payload:{roundId:id,number,startsAt:startsAt.toISOString(),deadlineAt:deadlineAt.toISOString()}}});
    return round;
}
export async function joinQueue(userId: string, raw: unknown) {
    const {searchType,targetQueueId,...q} = queueSchema.parse(raw);
    if(targetQueueId&&searchType!=='ROOM')throw fail('Invalid room request',400);
    return serial(async (tx) => {
        await lockUser(tx, userId);
        // Shared matchmaking state lives in PostgreSQL, including across Vercel instances.
        const scope = `queue:${q.seasonId}:${q.mode}:${q.level}:${q.ranked}:${q.scoring}:${q.questionCount}`;
        await tx.$queryRaw `SELECT pg_advisory_xact_lock(hashtextextended(${scope},0))::text`;
        const time = await now(tx), season = await tx.season.findUnique({ where: { id: q.seasonId } });
        if (!season || time < season.startsAt || time >= season.endsAt)
            throw fail('Season is not active');
        await tx.queueEntry.updateMany({ where: { status: 'WAITING', expiresAt: { lte: time } }, data: { status: 'EXPIRED' } });
        const active = await tx.matchParticipant.findFirst({ where: { userId, match: { status: { in: ['WAITING', 'ACTIVE'] } } },include:{match:true} });
        if (active){
            if(active.match.deadlineAt<=time){await matchLock(tx,active.matchId);await expire(tx,active.match,time);const updated=await tx.match.findUniqueOrThrow({where:{id:active.matchId}});if(updated.status==='ACTIVE')return {matchId:updated.id};}
            else return { matchId: active.matchId };
        }
        const existing = await tx.queueEntry.findFirst({ where: { userId, status: 'WAITING' } });
        if(existing&&targetQueueId)throw fail('Cancel current search first');
        if (existing)
            return { queueId: existing.id, expiresAt: existing.expiresAt };
        if(q.mode==='SENTENCE_RACE'&&q.ranked)throw fail('Ranked sentences require a curated CEFR pool; casual is available');
        const peer = searchType==='ROOM'&&!targetQueueId?null:await tx.queueEntry.findFirst({ where: { ...q, searchType, ...(targetQueueId?{id:targetQueueId}:{}), userId: { not: userId }, status: 'WAITING', expiresAt: { gt: time } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
        if(targetQueueId&&!peer)throw fail('Room unavailable');
        if (!peer) {
            const entry = await tx.queueEntry.create({ data: { userId, ...q, searchType, expiresAt: new Date(Math.min(time.getTime() + (searchType==='ROOM'?600000:60000), season.endsAt.getTime())) } });
            return { queueId: entry.id, expiresAt: entry.expiresAt };
        }
        const match = await tx.match.create({ data: { ...q, status: 'ACTIVE', deadlineAt:new Date(time.getTime()+33000), participants: { create: [{ userId: peer.userId, seat: 0 }, { userId, seat: 1 }] } } });
        const first=await scheduleRound(tx,match,1,time,season.endsAt);
        const deadlineAt=first.deadlineAt;
        await tx.queueEntry.update({ where: { id: peer.id }, data: { status: 'MATCHED', matchId: match.id } });
        await tx.queueEntry.create({ data: { userId, ...q, searchType, status: 'MATCHED', matchId: match.id, expiresAt: deadlineAt } });
        return { matchId: match.id };
    });
}
export async function getQueue(userId:string){
    const time=(await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;
    await db.queueEntry.updateMany({where:{userId,status:'WAITING',expiresAt:{lte:time}},data:{status:'EXPIRED'}});
    const active=(await db.matchParticipant.findMany({where:{userId,match:{status:{in:['ACTIVE','WAITING']}}},select:{matchId:true}})).map(p=>p.matchId);
    return db.queueEntry.findFirst({where:{userId,OR:[{status:'WAITING',expiresAt:{gt:time}},{status:'MATCHED',matchId:{in:active}}]},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true,status:true,matchId:true,expiresAt:true}});
}
export async function competitionLobby(userId:string){
    const time=(await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;
    const [seasons,queue,ratings]=await Promise.all([
        db.season.findMany({where:{startsAt:{lte:time},endsAt:{gt:time}},orderBy:[{startsAt:'desc'},{id:'asc'}],select:{id:true,startsAt:true,endsAt:true}}),
        getQueue(userId),db.rating.findMany({where:{userId,season:{endsAt:{gt:time}}},select:{seasonId:true,mode:true,level:true,scoring:true,value:true,games:true}})
    ]);
    return {serverTime:time,seasons,queue,ratings};
}
export async function cancelQueue(userId: string) {
    await db.queueEntry.updateMany({ where: { userId, status: 'WAITING' }, data: { status: 'CANCELLED' } });
    // A concurrent join may already have turned the queue entry into a match.
    const queue=await getQueue(userId);
    return {cancelled:!queue?.matchId,matchId:queue?.matchId??null};
}
export function elo(a: number, b: number, outcome: number, gamesA: number, gamesB: number) { const k = gamesA < 10 || gamesB < 10 ? 40 : 24; const delta = Math.round(k * (outcome - 1 / (1 + 10 ** ((b - a) / 400)))); return [a + delta, b - delta] as const; }
async function finish(tx: Tx, match: Match, reason: string, time: Date) {
    if (match.status === 'FINISHED' || match.status === 'CANCELLED')
        return;
    const participants = await tx.matchParticipant.findMany({ where: { matchId: match.id }, orderBy: { seat: 'asc' } });
    if (participants.length !== 2)
        throw fail('Duel Elo supports exactly two participants');
    if (match.ranked && !match.ratingApplied && participants.every(p => p.userId)) {
        // Stable lock order prevents crossed matches from deadlocking ratings.
        const ratings = new Map();
        for (const p of [...participants].sort((a, b) => a.userId!.localeCompare(b.userId!))) {
            const where = { userId_seasonId_mode_level_scoring: { userId: p.userId!, seasonId: match.seasonId, mode: match.mode, level: match.level,scoring:match.scoring } };
            const r = await tx.rating.upsert({ where, create: where.userId_seasonId_mode_level_scoring, update: {} });
            await tx.$queryRaw `SELECT id FROM "Rating" WHERE id=${r.id} FOR UPDATE`;
            ratings.set(p.id, await tx.rating.findUniqueOrThrow({ where: { id: r.id } }));
        }
        const [a, b] = participants, ra = ratings.get(a.id), rb = ratings.get(b.id), outcome = a.score === b.score ? .5 : a.score > b.score ? 1 : 0;
        const values = elo(ra.value, rb.value, outcome, ra.games, rb.games);
        for (let i = 0; i < 2; i++) {
            const p = participants[i], r = ratings.get(p.id);
            await tx.rating.update({ where: { id: r.id }, data: { value: values[i], games: { increment: 1 } } });
            await tx.ratingHistory.create({ data: { ratingId: r.id, matchId: match.id, seat: p.seat, before: r.value, after: values[i] } });
        }
    }
    await tx.match.update({ where: { id: match.id }, data: { status: 'FINISHED', finishedAt: time, reason, ratingApplied: match.ranked } });
    await tx.matchEvent.create({ data: { matchId: match.id, kind: 'finished', payload: { reason } } });
}
async function closeRound(tx:Tx,match:Match,round:{id:string;number:number;deadlineAt:Date},reason:string,closedAt:Date,winnerId?:string){
    await tx.matchRound.update({where:{id:round.id},data:{status:reason==='deadline'?'EXPIRED':'FINISHED',reason,winnerId:winnerId??null}});
    await tx.matchEvent.create({data:{matchId:match.id,kind:'round-finished',payload:{roundId:round.id,number:round.number,reason,winnerId:winnerId??null}}});
    if(round.number>=match.questionCount){await finish(tx,match,match.questionCount===1?reason:'series-complete',closedAt);return;}
    const season=await tx.season.findUniqueOrThrow({where:{id:match.seasonId}});
    if(closedAt.getTime()+4000>=season.endsAt.getTime()){await finish(tx,match,'season-ended',closedAt);return;}
    await scheduleRound(tx,match,round.number+1,closedAt,season.endsAt);
}
async function expire(tx:Tx,match:Match,time:Date){
    let current=match;
    for(let n=0;n<20&&['ACTIVE','WAITING'].includes(current.status)&&current.deadlineAt<=time;n++){
        const round=await tx.matchRound.findFirst({where:{matchId:current.id,status:{in:['SCHEDULED','OPEN']}},orderBy:{number:'desc'}});
        if(!round){await finish(tx,current,'deadline',time);return;}
        await closeRound(tx,current,round,'deadline',round.deadlineAt);
        current=await tx.match.findUniqueOrThrow({where:{id:current.id}});
    }
}
export async function submitRound(userId: string, raw: unknown) {
    const input = submissionSchema.parse(raw);
    return serial(async (tx) => {
        const initial = await tx.matchRound.findUnique({ where: { id: input.roundId } });
        if (!initial)
            throw fail('Round not found', 404);
        await matchLock(tx, initial.matchId);
        const round = await tx.matchRound.findUniqueOrThrow({ where: { id: input.roundId }, include: { version: { include: { answers: true } } } }), match = await tx.match.findUniqueOrThrow({ where: { id: round.matchId } }), participant = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId: match.id, userId } } });
        if (!participant || participant.leftAt || participant.disqualification)
            throw fail('Not a participant', 403);
        const expected = Buffer.from(round.tokenHash), supplied = Buffer.from(hash(input.token));
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
            throw fail('Invalid round token', 403);
        const old = await tx.roundSubmission.findUnique({ where: { roundId_participantId: { roundId: round.id, participantId: participant.id } } });
        if (old)
            return old;
        const received = await now(tx);
        if (received < round.startsAt)
            throw fail('Round has not started');
        if (received >= round.deadlineAt) {
            await expire(tx, match, received);
            return { accepted: false, reason: 'deadline' };
        }
        if (match.status !== 'ACTIVE' || ['FINISHED', 'EXPIRED'].includes(round.status))
            return { accepted: false, reason: 'finished' };
        const choices = (round.publicData as {
            choices?: {
                id: string;
                text: string;
            }[];
        }).choices;
        const answer = match.mode === 'WORD_CHOICE_RACE' ? choices?.find(c => c.id === input.answer)?.text : input.answer;
        const correct = typeof answer === 'string' && round.version.answers.some(a => normalizeSentence(a.answer) === normalizeSentence(answer));
        const submission = await tx.roundSubmission.create({ data: { roundId: round.id, participantId: participant.id, requestId: input.requestId, answer: input.answer, correct, accepted: true, serverReceivedAt: received, clientSentAt: input.clientSentAt ? new Date(input.clientSentAt) : null } });
        const allAnswered=async()=>await tx.roundSubmission.count({where:{roundId:round.id}})>=2;
        if(match.scoring==='SPEED'){
            const winner=correct?participant:await tx.matchParticipant.findFirstOrThrow({where:{matchId:match.id,id:{not:participant.id}}});
            await tx.matchParticipant.update({where:{id:winner.id},data:{score:{increment:1}}});
            await closeRound(tx,match,round,correct?'correct-answer':'first-incorrect',received,winner.id);
        }else if(match.scoring==='ACCURACY'){
            if(correct)await tx.matchParticipant.update({where:{id:participant.id},data:{score:{increment:1}}});
            if(await allAnswered())await closeRound(tx,match,round,'both-answered',received);
            else await tx.matchRound.update({where:{id:round.id},data:{status:'OPEN'}});
        }else if(correct){
            await tx.matchParticipant.update({where:{id:participant.id},data:{score:{increment:1}}});
            await closeRound(tx,match,round,'correct-answer',received,participant.id);
        }else if(await allAnswered())await closeRound(tx,match,round,'all-incorrect',received);
        else await tx.matchRound.update({where:{id:round.id},data:{status:'OPEN'}});
        await tx.matchEvent.create({ data: { matchId: match.id, kind: 'submission', payload: { roundId: round.id, participantId: participant.id } } });
        return submission;
    });
}
export async function getMatch(userId: string, id: string, after = '0') {
    if (!/^\d{1,19}$/.test(after)||BigInt(after)>9223372036854775807n)
        throw fail('Invalid cursor', 400);
    return serial(async (tx) => {
        await matchLock(tx, id);
        const match = await tx.match.findUnique({ where: { id } });
        if (!match)
            throw fail('Not found', 404);
        let participants = await tx.matchParticipant.findMany({ where: { matchId: id },orderBy:{seat:'asc'}, select: { id: true, userId: true, seat: true, score: true, leftAt: true,user:{select:{name:true}} } });
        if (!participants.some(p => p.userId === userId))
            throw fail('Not a participant', 403);
        const time = await now(tx);
        await expire(tx, match, time);
        participants=await tx.matchParticipant.findMany({where:{matchId:id},orderBy:{seat:'asc'},select:{id:true,userId:true,seat:true,score:true,leftAt:true,user:{select:{name:true}}}});
        const current = await tx.match.findUniqueOrThrow({ where: { id } }), rounds = await tx.matchRound.findMany({ where: { matchId: id }, include: { version: { include: { answers: true } } }, orderBy: { number: 'asc' } }), events = await tx.matchEvent.findMany({ where: { matchId: id, sequence: { gt: BigInt(after) } }, take: 100, orderBy: { sequence: 'asc' } });
        const self=participants.find(p=>p.userId===userId)!;
        const submissions=await tx.roundSubmission.findMany({where:{participantId:self.id},select:{roundId:true,accepted:true,correct:true,answer:true,serverReceivedAt:true}});
        const ratingChanges=['FINISHED','CANCELLED'].includes(current.status)?await tx.ratingHistory.findMany({where:{matchId:id},select:{seat:true,before:true,after:true}}):[];
        return { id, current, serverTime: time, participants: participants.map(({ userId: privateId,user:profile, ...p }) => ({...p,isYou:privateId===userId,name:profile?.name??'Klar'})), submissions,ratingChanges,rounds: rounds.map(r => ({ id: r.id, number: r.number, status: r.status, startsAt: r.startsAt, deadlineAt: r.deadlineAt, winnerId: r.winnerId,reason:r.reason, ...(time >= r.startsAt ? { token: token(r.id), question: r.publicData } : {}), ...(['FINISHED', 'EXPIRED'].includes(r.status) ? { answers: r.version.answers.map(a => a.answer) } : {}) })), events: events.map(e => ({ ...e, sequence: String(e.sequence) })) };
    });
}
export async function leaveMatch(userId:string,id:string){return serial(async tx=>{
    await matchLock(tx,id);let match=await tx.match.findUniqueOrThrow({where:{id}});
    const self=await tx.matchParticipant.findUnique({where:{matchId_userId:{matchId:id,userId}}});if(!self)throw fail('Not a participant',403);
    const time=await now(tx);await expire(tx,match,time);match=await tx.match.findUniqueOrThrow({where:{id}});if(match.status!=='ACTIVE')return;
    const peer=await tx.matchParticipant.findFirstOrThrow({where:{matchId:id,id:{not:self.id}}});
    await tx.matchParticipant.update({where:{id:self.id},data:{leftAt:time}});
    await tx.matchParticipant.update({where:{id:peer.id},data:{score:Math.max(peer.score,self.score+1)}});
    await tx.matchRound.updateMany({where:{matchId:id,status:{in:['SCHEDULED','OPEN']}},data:{status:'FINISHED',winnerId:peer.id,reason:'opponent-left'}});
    await finish(tx,match,'opponent-left',time);
});}
export async function expireMatches() { const time=(await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;await db.queueEntry.updateMany({where:{status:'WAITING',expiresAt:{lte:time}},data:{status:'EXPIRED'}});const matches = await db.match.findMany({ where: { status: { in: ['ACTIVE', 'WAITING'] }, deadlineAt: { lte: time } }, take: 100, select: { id: true } }); for (const m of matches)
    await serial(async (tx) => { await matchLock(tx, m.id); const current = await tx.match.findUniqueOrThrow({ where: { id: m.id } }); await expire(tx, current, await now(tx)); }); return matches.length; }
export async function leaderboard(seasonId: string, mode: RaceMode, level: string,scoring='FIRST_CORRECT') {
    const rows=await db.rating.findMany({where:{seasonId,mode,level,scoring,games:{gte:5}},orderBy:[{value:'desc'},{games:'desc'},{userId:'asc'}],take:100,select:{value:true,games:true,user:{select:{name:true}}}});
    return rows.map(row=>({value:row.value,games:row.games,name:row.user.name}));
}

export async function openGames(userId:string){
 const time=(await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;
 const rows=await db.queueEntry.findMany({where:{searchType:'ROOM',status:'WAITING',userId:{not:userId},expiresAt:{gt:time},season:{startsAt:{lte:time},endsAt:{gt:time}}},orderBy:[{createdAt:'desc'},{id:'asc'}],take:100,select:{id:true,seasonId:true,mode:true,level:true,ranked:true,scoring:true,questionCount:true,expiresAt:true,user:{select:{name:true}}}});
 return rows.map(({user,...room})=>({...room,name:user.name}));
}
