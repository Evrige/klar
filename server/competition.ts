import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db, serial, lockUser, type Tx } from './db.ts';
import { hash } from './hash.ts';
import { json } from './import.ts';
import { normalizeSentence } from '../src/data/sentences.ts';
import type { Match, RaceMode } from './generated/prisma/client.ts';
const fail = (message: string, status = 409) => Object.assign(new Error(message), { status });
export const queueSchema = z.object({ seasonId: z.string().min(1).max(200), mode: z.enum(['SENTENCE_RACE', 'WORD_CHOICE_RACE']), level: z.enum(['A1', 'A2', 'B1']), ranked: z.boolean() }).strict();
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
export async function joinQueue(userId: string, raw: unknown) {
    const q = queueSchema.parse(raw);
    return serial(async (tx) => {
        await lockUser(tx, userId);
        // Shared matchmaking state lives in PostgreSQL, including across Vercel instances.
        const scope = `queue:${q.seasonId}:${q.mode}:${q.level}:${q.ranked}`;
        await tx.$queryRaw `SELECT pg_advisory_xact_lock(hashtextextended(${scope},0))::text`;
        const time = await now(tx), season = await tx.season.findUnique({ where: { id: q.seasonId } });
        if (!season || time < season.startsAt || time >= season.endsAt)
            throw fail('Season is not active');
        await tx.queueEntry.updateMany({ where: { status: 'WAITING', expiresAt: { lte: time } }, data: { status: 'EXPIRED' } });
        const active = await tx.matchParticipant.findFirst({ where: { userId, match: { status: { in: ['WAITING', 'ACTIVE'] } } } });
        if (active)
            return { matchId: active.matchId };
        const existing = await tx.queueEntry.findFirst({ where: { userId, status: 'WAITING' } });
        if (existing)
            return { queueId: existing.id, expiresAt: existing.expiresAt };
        if(q.mode==='SENTENCE_RACE'&&q.ranked)throw fail('Ranked sentences require a curated CEFR pool; casual is available');
        const peer = await tx.queueEntry.findFirst({ where: { ...q, userId: { not: userId }, status: 'WAITING', expiresAt: { gt: time } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
        if (!peer) {
            const entry = await tx.queueEntry.create({ data: { userId, ...q, expiresAt: new Date(Math.min(time.getTime() + 60000, season.endsAt.getTime())) } });
            return { queueId: entry.id, expiresAt: entry.expiresAt };
        }
        const versions = await tx.exerciseVersion.findMany({ where: { exercise: { domain: q.mode === 'SENTENCE_RACE' ? 'sentence' : 'word', ...(q.mode === 'WORD_CHOICE_RACE' ? { level: q.level } : {}) } }, include: { answers: true }, take: 250, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
        if (q.mode === 'SENTENCE_RACE' && q.ranked)
            throw fail('Ranked sentences require a curated CEFR pool; casual is available');
        const version = shuffle(versions)[0];
        if (!version)
            throw fail('No eligible exercises; seed catalog first');
        let publicData: Record<string, unknown> = { prompt: version.prompt };
        if (q.mode === 'WORD_CHOICE_RACE') {
            const correct = version.answers[0].answer;
            const distractors = shuffle(versions.filter(x => x.id !== version.id).flatMap(x => x.answers.map(a => a.answer))).filter(x => x !== correct);
            const choices = shuffle([correct, ...new Set(distractors)].slice(0, 4)).map(text => ({ id: randomUUID(), text }));
            if (choices.length !== 4)
                throw fail('Not enough distinct choices');
            publicData = { prompt: version.prompt, choices };
        }
        else {
            const tokens=(version.publicData as {tokens?:{text:string}[]}).tokens;
            if(!tokens)throw fail('Sentence has no token bank');
            // The catalog's numeric token IDs encode the solution order.
            // Round IDs must therefore be fresh and unrelated to those indices.
            publicData.tokens=shuffle(tokens.map(t=>({id:randomUUID(),text:t.text})));
        }
        const startsAt = new Date(time.getTime() + 3000), deadlineAt = new Date(Math.min(startsAt.getTime() + 30000, season.endsAt.getTime()));
        if (deadlineAt.getTime() - startsAt.getTime() < 5000)
            throw fail('Season ending');
        const match = await tx.match.create({ data: { ...q, status: 'ACTIVE', deadlineAt, participants: { create: [{ userId: peer.userId, seat: 0 }, { userId, seat: 1 }] } } });
        const roundId = randomUUID();
        await tx.matchRound.create({ data: { id: roundId, matchId: match.id, number: 1, versionId: version.id, tokenHash: hash(token(roundId)), startsAt, deadlineAt, publicData: json(publicData) } });
        await tx.queueEntry.update({ where: { id: peer.id }, data: { status: 'MATCHED', matchId: match.id } });
        await tx.queueEntry.create({ data: { userId, ...q, status: 'MATCHED', matchId: match.id, expiresAt: deadlineAt } });
        await tx.matchEvent.create({ data: { matchId: match.id, kind: 'scheduled', payload: { roundId, startsAt: startsAt.toISOString(), deadlineAt: deadlineAt.toISOString() } } });
        return { matchId: match.id };
    });
}
export async function cancelQueue(userId: string) { await db.queueEntry.updateMany({ where: { userId, status: 'WAITING' }, data: { status: 'CANCELLED' } }); }
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
            const where = { userId_seasonId_mode_level: { userId: p.userId!, seasonId: match.seasonId, mode: match.mode, level: match.level } };
            const r = await tx.rating.upsert({ where, create: where.userId_seasonId_mode_level, update: {} });
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
async function expire(tx: Tx, match: Match, time: Date) { if (['ACTIVE', 'WAITING'].includes(match.status) && match.deadlineAt <= time) {
    await tx.matchRound.updateMany({ where: { matchId: match.id, status: { in: ['SCHEDULED', 'OPEN'] } }, data: { status: 'EXPIRED', reason: 'deadline' } });
    await finish(tx, match, 'deadline', time);
} }
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
        if (correct) {
            await tx.matchRound.update({ where: { id: round.id }, data: { status: 'FINISHED', winnerId: participant.id, reason: 'first-server-accepted' } });
            await tx.matchParticipant.update({ where: { id: participant.id }, data: { score: { increment: 1 } } });
            await finish(tx, match, 'correct-answer', received);
        }
        else if (await tx.roundSubmission.count({ where: { roundId: round.id } }) >= await tx.matchParticipant.count({ where: { matchId: match.id } })) {
            await tx.matchRound.update({ where: { id: round.id }, data: { status: 'FINISHED', reason: 'all-incorrect' } });
            await finish(tx, match, 'all-incorrect', received);
        }
        else
            await tx.matchRound.update({ where: { id: round.id }, data: { status: 'OPEN' } });
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
        const participants = await tx.matchParticipant.findMany({ where: { matchId: id }, select: { id: true, userId: true, seat: true, score: true, leftAt: true } });
        if (!participants.some(p => p.userId === userId))
            throw fail('Not a participant', 403);
        const time = await now(tx);
        await expire(tx, match, time);
        const current = await tx.match.findUniqueOrThrow({ where: { id } }), rounds = await tx.matchRound.findMany({ where: { matchId: id }, include: { version: { include: { answers: true } } }, orderBy: { number: 'asc' } }), events = await tx.matchEvent.findMany({ where: { matchId: id, sequence: { gt: BigInt(after) } }, take: 100, orderBy: { sequence: 'asc' } });
        return { id, current, serverTime: time, participants: participants.map(({ userId: _userId, ...p }) => p), rounds: rounds.map(r => ({ id: r.id, number: r.number, status: r.status, startsAt: r.startsAt, deadlineAt: r.deadlineAt, winnerId: r.winnerId, ...(time >= r.startsAt ? { token: token(r.id), question: r.publicData } : {}), ...(['FINISHED', 'EXPIRED'].includes(r.status) ? { answers: r.version.answers.map(a => a.answer) } : {}) })), events: events.map(e => ({ ...e, sequence: String(e.sequence) })) };
    });
}
export async function leaveMatch(userId: string, id: string) { return serial(async (tx) => { await matchLock(tx, id); const m = await tx.match.findUniqueOrThrow({ where: { id } }), p = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId: id, userId } } }); if (!p)
    throw fail('Not a participant', 403); if (m.status !== 'ACTIVE')
    return; const time = await now(tx); await tx.matchParticipant.update({ where: { id: p.id }, data: { leftAt: time } }); await tx.matchParticipant.updateMany({ where: { matchId: id, id: { not: p.id } }, data: { score: { increment: 1 } } }); await tx.matchRound.updateMany({ where: { matchId: id, status: { in: ['SCHEDULED', 'OPEN'] } }, data: { status: 'FINISHED', reason: 'opponent-left' } }); await finish(tx, m, 'opponent-left', time); }); }
export async function expireMatches() { const time=(await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;await db.queueEntry.updateMany({where:{status:'WAITING',expiresAt:{lte:time}},data:{status:'EXPIRED'}});const matches = await db.match.findMany({ where: { status: { in: ['ACTIVE', 'WAITING'] }, deadlineAt: { lte: time } }, take: 100, select: { id: true } }); for (const m of matches)
    await serial(async (tx) => { await matchLock(tx, m.id); const current = await tx.match.findUniqueOrThrow({ where: { id: m.id } }); await expire(tx, current, await now(tx)); }); return matches.length; }
export async function leaderboard(seasonId: string, mode: RaceMode, level: string) { return db.rating.findMany({ where: { seasonId, mode, level, games: { gte: 5 }, user: { profile: { listed: true } } }, orderBy: [{ value: 'desc' }, { games: 'desc' }, { userId: 'asc' }], take: 100, select: { value: true, games: true, user: { select: { profile: { select: { handle: true, displayName: true } } } } } }); }
