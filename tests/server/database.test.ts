import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const url = process.env.TEST_DATABASE_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/klar_test')
    throw new Error('Integration tests require explicit local klar_test database');
process.env.DATABASE_URL = url;
process.env.DATABASE_ADAPTER = 'pg';
const { db } = await import('../../server/db.ts');
const { seed } = await import('../../prisma/seed.ts');
const { importSnapshot } = await import('../../server/import.ts');
const {previewSnapshot}=await import('../../server/import.ts');
const {exportAccount,deleteAccount}=await import('../../server/account.ts');
const {setProfile}=await import('../../server/profile.ts');
const {validLearning}=await import('../../src/learning/model.ts');
const { readProgress } = await import('../../server/progress.ts');
const { syncEvents } = await import('../../server/sync.ts');
const { joinQueue, getMatch, submitRound, expireMatches, elo } = await import('../../server/competition.ts');
const { requireAdmin } = await import('../../server/auth.ts');
const { serializeSignedCookie } = await import('better-call');
const { requireUser } = await import('../../server/auth.ts');
const apiHandler = (await import('../../api/index.ts')).default;
const { emptyLearning, studyDate } = await import('../../src/learning/model.ts');
const { vocabulary } = await import('../../src/data/vocabulary.ts');
const { courseLessons } = await import('../../src/data/course.ts');
const { sentences } = await import('../../src/data/sentences.ts');
const { miniLessons } = await import('../../src/learning/lessons.ts');
const {nouns}=await import('../../src/data/nouns.ts');
const { hash } = await import('../../server/hash.ts');
const run = randomUUID(), userA = `test-a-${run}`, userB = `test-b-${run}`, userC = `test-c-${run}`, deviceA = randomUUID(), deviceB = randomUUID(), word = vocabulary[0].id, lesson = courseLessons[0].id, day = '2026-10-25';
let seedCounts: unknown;
before(async () => { seedCounts = await seed(); for (const id of [userA, userB, userC])
    await db.user.create({ data: { id, name: id, email: `${id}@example.invalid` } }); }, { timeout: 300000 });
after(async () => { await db.$disconnect(); });
test('large real import preserves 8000 skill rows without row-by-row request loops',{timeout:120000},async()=>{
    const id=`bulk-${run}`;await db.user.create({data:{id,name:'bulk',email:`${id}@example.invalid`}});
    const learning=emptyLearning();for(const w of vocabulary)for(const mode of ['recognition','recall','spelling','listening'])learning.skills[`${mode}:${w.id}`]={attempts:2,correct:1,stage:1,due:Date.now(),last:Date.now()-1000};
    const snapshot={'klar:learning:v1':learning,'klar:vocabulary:v1':Object.fromEntries(vocabulary.map(w=>[w.id,'learning']))};
    await importSnapshot(id,{schemaVersion:1,deviceId:deviceA,snapshot});await importSnapshot(id,{schemaVersion:1,deviceId:deviceB,snapshot});
    assert.equal(await db.userWordSkill.count({where:{userId:id}}),8000);assert.equal(await db.userWordStatus.count({where:{userId:id}}),2000);
});
const input = (snapshot: unknown, deviceId = deviceA) => ({ schemaVersion: 1, deviceId, snapshot });
test('real catalog seed twice is idempotent and keeps alternative answers', { timeout: 300000 }, async () => {
    const before = { words: await db.word.count(), verbs: await db.verb.count(), nouns: await db.nounForm.count(), videos: await db.lesson.count({ where: { kind: 'video' } }), mini: await db.lesson.count({ where: { kind: 'mini' } }), versions: await db.exerciseVersion.count(), answers: await db.answerVariant.count() };
    assert.deepEqual(seedCounts, { words: 2000, verbs: 71, nouns: 81, sentences: 1588, videos: 228, miniLessons: 8 });
    await seed();
    assert.deepEqual({ ...before, versions: await db.exerciseVersion.count(), answers: await db.answerVariant.count() }, before);
    assert.equal(await db.word.count(), 2000);
    assert.equal(await db.verb.count(), 71);
    assert.equal(await db.nounForm.count(), 81);
    assert.equal(before.videos, 228);
    assert.equal(before.mini, 8);
    const version = await db.exerciseVersion.findFirstOrThrow({ where: { exerciseId: 'sentence:learn' }, include: { answers: true } });
    assert(version.answers.some(a => a.answer === 'Heute lerne ich Deutsch'));
});
test('all legacy learning fields, markers, IDs and daily journal survive double import', async () => {
    const learning = emptyLearning();
    learning.skills[`recall:${word}`] = { attempts: 10, correct: 8, stage: 3, due: 1793000000000, last: 1792900000000 };
    learning.days = [day];
    learning.processed = ['old-marker'];
    learning.lessons[miniLessons[0].id] = ['dialogue'];
    learning.journal = { started: day, days: { [day]: { attempts: 10, correct: 8, words: [word], skills: [`recall:${word}`], resolved: ['mistake-old'], lessons: [miniLessons[0].id] } } };
    learning.mistakes.old = { key: 'old', domain: 'word', prompt: 'p', answers: ['a'], answer: 'b', correct: false, explanation: 'ex', wordId: word, mode: 'recall', audio: 'Hallo', caseSensitive: true, failures: 2, lastWrong: 1792800000000, due: 1792900000000, recovery: 1, resolved: false };
    const snapshot = { 'klar:learning:v1': learning, 'klar:vocabulary:v1': { [word]: 'known' }, 'klar:course:v1': { [lesson]: { video: true, practice: false, note: 'first' } }, 'klar:mastered:v1': ['machen:0'], 'klar:nouns:v1': ['Haus:article'], 'klar:sentences:v1': ['learn'], 'klar:daily:v1': { [day]: { ruleRead: true, words: [word], nounsDone: false, sentenceDone: true } }, 'klar:activity:v1': { days: [day], words: [word] }, 'klar:xp:v1': 700, 'klar:achievements:v1': { 'streak-40': '2026-10-25T12:00:00Z' } };
    const first = await importSnapshot(userA, input(snapshot));
    const second = await importSnapshot(userA, input(snapshot));
    assert.equal(first.id, second.id);
    assert.equal('duplicate' in second && second.duplicate, true);
    const current = (await readProgress(userA, deviceA)).snapshot;
    assert.deepEqual(current['klar:learning:v1']?.journal, learning.journal);
    assert.deepEqual(current['klar:learning:v1']?.mistakes.old, learning.mistakes.old);
    assert(current['klar:mastered:v1']?.includes('machen:0'));
    assert(current['klar:sentences:v1']?.includes('learn'));
    assert.equal(current['klar:xp:v1'], 700);
    assert.equal(await db.syncEvent.count({ where: { userId: userA, kind: 'legacy-marker' } }), 1);
    assert.equal(await db.rating.count({ where: { userId: userA } }), 0);
});
test('overlapping devices use lower bounds and report note/status/SRS conflicts', async () => {
    const learning = emptyLearning();
    learning.skills[`recall:${word}`] = { attempts: 12, correct: 9, stage: 1, due: 1792000000000, last: 1791900000000 };
    learning.journal = { started: day, days: { [day]: { attempts: 12, correct: 9, words: [word, vocabulary[1].id], skills: [], resolved: [], lessons: [] } } };
    const report = await importSnapshot(userA, input({ 'klar:learning:v1': learning, 'klar:vocabulary:v1': { [word]: 'learning' }, 'klar:course:v1': { [lesson]: { video: false, practice: true, note: 'second' } }, 'klar:xp:v1': 500 }, deviceB));
    assert('conflicts' in report);
    const kinds = (report.conflicts as {
        kind: string;
    }[]).map(c => c.kind);
    assert(kinds.includes('status'));
    assert(kinds.includes('note'));
    assert(kinds.includes('srs'));
    const s = (await readProgress(userA)).snapshot;
    assert.equal(s['klar:learning:v1']?.skills[`recall:${word}`].attempts, 12);
    assert.equal(s['klar:learning:v1']?.skills[`recall:${word}`].stage, 3);
    assert.equal(s['klar:learning:v1']?.journal?.days[day].attempts, 12);
    assert.equal(s['klar:course:v1']?.[lesson].note, 'first');
    assert.equal(s['klar:course:v1']?.[lesson].practice, true);
    assert.equal(s['klar:xp:v1'], 700);
});
test('event retry, stale revisions and late SRS attempts are safe', async () => {
    const clientEventId = randomUUID(), occurredAt = Date.now(), payload = { key: `word:${word}`, domain: 'word', prompt: 'p', answers: ['a'], answer: 'a', correct: true, explanation: 'e', wordId: word, mode: 'recall' };
    await syncEvents(userA, { deviceId: deviceA, events: [{ kind: 'attempt', clientEventId, occurredAt, payload }] });
    const before = (await readProgress(userA)).snapshot['klar:learning:v1']!.skills[`recall:${word}`];
    await syncEvents(userA, { deviceId: deviceA, events: [{ kind: 'attempt', clientEventId, occurredAt, payload }] });
    assert.deepEqual((await readProgress(userA)).snapshot['klar:learning:v1']!.skills[`recall:${word}`], before);
    await syncEvents(userA, { deviceId: deviceB, events: [{ kind: 'attempt', clientEventId: randomUUID(), occurredAt: occurredAt - 3600000, payload: { ...payload, correct: false } }] });
    const after = (await readProgress(userA)).snapshot['klar:learning:v1']!.skills[`recall:${word}`];
    assert.equal(after.stage, before.stage);
    assert.equal(after.due, before.due);
    assert.equal(after.last, before.last);
    await syncEvents(userA, { deviceId: deviceA, events: [{ kind: 'status', clientEventId: randomUUID(), occurredAt, payload: { wordId: word, status: 'learning', revision: 0 } }] });
    const conflict = await syncEvents(userA, { deviceId: deviceB, events: [{ kind: 'status', clientEventId: randomUUID(), occurredAt, payload: { wordId: word, status: 'known', revision: 0 } }] });
    assert.equal((conflict.results[0].result as {
        conflict: boolean;
    }).conflict, true);
});
test('unknown IDs are reported and foreign userId/score/correct fields rejected', async () => {
    const report = await importSnapshot(userC, input({ 'klar:vocabulary:v1': { 'removed-word': 'known' } }));
    assert('unknown' in report && report.unknown.length === 1);
    assert.deepEqual((await readProgress(userB)).snapshot['klar:vocabulary:v1'], {});
    await assert.rejects(importSnapshot(userA, { ...input({}), userId: userB }));
    await assert.rejects(syncEvents(userA, { deviceId: deviceA, userId: userB, events: [] }));
    await assert.rejects(submitRound(userA, { roundId: randomUUID(), requestId: randomUUID(), token: 'x', answer: 'x', score: 900, correct: true, userId: userB }));
});
async function duel(ranked = true) { const seasonId = `season-${randomUUID()}`; await db.season.create({ data: { id: seasonId, startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 600000) } }); const q = { seasonId, mode: 'WORD_CHOICE_RACE', level: 'A1', ranked }; await joinQueue(userA, q); const match = await joinQueue(userB, q); assert('matchId' in match && match.matchId); const id = match.matchId!; return { id, seasonId }; }
test('round hidden before start; two concurrent answers yield one winner and one rating application', async () => {
    const { id } = await duel();
    const hidden = await getMatch(userA, id);
    assert.equal('question' in hidden.rounds[0], false);
    await assert.rejects(getMatch(userC, id));
    await db.matchRound.updateMany({ where: { matchId: id }, data: { startsAt: new Date(Date.now() - 1000) } });
    const state = await getMatch(userA, id), round = state.rounds[0];
    const version = await db.matchRound.findUniqueOrThrow({ where: { id: round.id }, include: { version: { include: { answers: true } } } });
    const choices = (round.question as {
        choices: {
            id: string;
            text: string;
        }[];
    }).choices;
    const answer = choices.find(c => c.text === version.version.answers[0].answer)!.id;
    const result = await Promise.all([userA, userB].map(userId => submitRound(userId, { roundId: round.id, token: round.token, requestId: randomUUID(), answer })));
    assert.equal(result.filter(r => 'correct' in r && r.correct).length, 1);
    assert.equal(await db.ratingHistory.count({ where: { matchId: id } }), 2);
    assert.equal((await db.matchParticipant.findMany({ where: { matchId: id } })).reduce((sum, p) => sum + p.score, 0), 1);
    const winner = (await db.roundSubmission.findFirstOrThrow({ where: { roundId: round.id, correct: true }, include: { participant: true } }));
    await submitRound(winner.participant.userId!, { roundId: round.id, token: round.token, requestId: randomUUID(), answer });
    await expireMatches();
    assert.equal(await db.ratingHistory.count({ where: { matchId: id } }), 2);
});
test('incorrect answer consumes only that participant attempt; retries cannot guess again', async () => {
    const { id } = await duel(false);
    await db.matchRound.updateMany({ where: { matchId: id }, data: { startsAt: new Date(Date.now() - 1000) } });
    const state = await getMatch(userA, id), round = state.rounds[0];
    const version = await db.matchRound.findUniqueOrThrow({ where: { id: round.id }, include: { version: { include: { answers: true } } } });
    const choices = (round.question as {
        choices: {
            id: string;
            text: string;
        }[];
    }).choices, correct = choices.find(c => c.text === version.version.answers[0].answer)!.id, wrong = choices.find(c => c.id !== correct)!.id;
    const first = await submitRound(userA, { roundId: round.id, token: round.token, requestId: randomUUID(), answer: wrong });
    assert('correct' in first && !first.correct);
    assert.equal((await db.match.findUniqueOrThrow({ where: { id } })).status, 'ACTIVE');
    const retry = await submitRound(userA, { roundId: round.id, token: round.token, requestId: randomUUID(), answer: correct });
    assert('correct' in retry && !retry.correct);
    const peer = await submitRound(userB, { roundId: round.id, token: round.token, requestId: randomUUID(), answer: correct });
    assert('correct' in peer && peer.correct);
    assert.equal(await db.ratingHistory.count({ where: { matchId: id } }), 0);
});
test('deadline/reconnect are durable and expiry is idempotent', async () => {
    const { id } = await duel();
    await db.match.update({ where: { id }, data: { deadlineAt: new Date(Date.now() - 1) } });
    await db.matchRound.updateMany({ where: { matchId: id }, data: { startsAt: new Date(Date.now() - 2000), deadlineAt: new Date(Date.now() - 1000) } });
    await expireMatches();
    const a = await getMatch(userA, id);
    const cursor = a.events.at(-1)?.sequence ?? '0';
    const b = await getMatch(userB, id, cursor);
    assert.equal(b.current.status, 'FINISHED');
    assert.equal(b.events.length, 0);
    await expireMatches();
    assert.equal(await db.ratingHistory.count({ where: { matchId: id } }), 2);
});
test('Berlin midnight/DST, season boundaries and Elo are deterministic', async () => {
    assert.equal(studyDate(Date.parse('2026-03-28T23:30:00Z')), '2026-03-29');
    assert.equal(studyDate(Date.parse('2026-03-29T22:30:00Z')), '2026-03-30');
    assert.equal(studyDate(Date.parse('2026-10-25T23:30:00Z')), '2026-10-26');
    assert.deepEqual(elo(1000, 1000, .5, 0, 0), [1000, 1000]);
    assert.deepEqual(elo(1000, 1000, 1, 0, 0), [1020, 980]);
    const id = `ended-${randomUUID()}`;
    await db.season.create({ data: { id, startsAt: new Date(Date.now() - 2000), endsAt: new Date(Date.now() - 1000) } });
    await assert.rejects(joinQueue(userC, { seasonId: id, mode: 'WORD_CHOICE_RACE', level: 'A1', ranked: true }));
});
async function sessionHeaders(userId: string) { const token = randomUUID(); await db.session.create({ data: { id: randomUUID(), token, userId, expiresAt: new Date(Date.now() + 3600000) } }); const cookie = (await serializeSignedCookie('better-auth.session_token', token, process.env.BETTER_AUTH_SECRET!)).split(';')[0]; return new Headers({ cookie, origin: process.env.BETTER_AUTH_URL! }); }
test('roles default USER; signed sessions isolate users and live role changes control admin access', async () => { assert.equal((await db.user.findUniqueOrThrow({ where: { id: userA } })).role, 'USER'); await assert.rejects(requireAdmin(new Headers()), /Unauthorized/); const headers = await sessionHeaders(userA); assert.equal(await requireUser(headers), userA); await assert.rejects(requireAdmin(headers), /Forbidden/); await db.user.update({ where: { id: userA }, data: { role: 'ADMIN' } }); assert.equal(await requireAdmin(headers), userA); await db.user.update({ where: { id: userA }, data: { role: 'USER' } }); await assert.rejects(requireAdmin(headers), /Forbidden/); });
test('HTTP progress endpoint ignores no client identity and rejects writes with foreign userId', async () => { const headers = await sessionHeaders(userB); async function call(path: string, query: Record<string, string> = {}, method = 'GET', body?: unknown) { let status = 200, output: unknown; const res = { setHeader: () => { }, status(code: number) { status = code; return this; }, json(value: unknown) { output = value; return this; } }; await apiHandler({ headers: Object.fromEntries(headers), query: { path, ...query }, method, body } as never, res as never); return { status, output }; } const own = await call('progress', { userId: userA }); assert.equal(own.status, 200); assert.deepEqual((own.output as {
    snapshot: Record<string, unknown>;
}).snapshot['klar:vocabulary:v1'], {}); const forged = await call('import', {}, 'POST', { ...input({}), userId: userA }); assert.equal(forged.status, 400); });
test('server accepts alternative sentence order pinned in the round version', async () => { const seasonId = `sentence-${randomUUID()}`; await db.season.create({ data: { id: seasonId, startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 600000) } }); const q = { seasonId, mode: 'SENTENCE_RACE', level: 'A1', ranked: false }; await joinQueue(userA, q); const joined = await joinQueue(userB, q); assert('matchId' in joined && joined.matchId); const id = joined.matchId!, v = await db.exerciseVersion.findFirstOrThrow({ where: { exerciseId: 'sentence:learn' } }); await db.matchRound.updateMany({ where: { matchId: id }, data: { versionId: v.id, startsAt: new Date(Date.now() - 1000) } }); const r = (await getMatch(userA, id)).rounds[0]; const answer = await submitRound(userA, { roundId: r.id, token: r.token, requestId: randomUUID(), answer: 'Heute lerne ich Deutsch' }); assert('correct' in answer && answer.correct); });
test('timestamptz writes match absolute UTC server time', async () => { const at = new Date(), id = `utc-${randomUUID()}`; await db.season.create({ data: { id, startsAt: at, endsAt: new Date(at.getTime() + 60000) } }); const row = (await db.$queryRaw<{
    epoch: number;
}[]> `SELECT extract(epoch FROM "startsAt")::float8 AS epoch FROM "Season" WHERE id=${id}`)[0]; assert(Math.abs(row.epoch * 1000 - at.getTime()) < 2); });

async function newUser(label:string){const id=`${label}-${randomUUID()}`;await db.user.create({data:{id,name:label,email:`${id}@example.invalid`}});return id;}
test('preview reports conflicts but rolls back all mutations',async()=>{
    const id=await newUser('preview');const report=await previewSnapshot(id,input({'klar:vocabulary:v1':{[word]:'known'},'klar:xp:v1':500}));assert.equal(report.keys.length,2);assert.equal(await db.userSettings.count({where:{userId:id}}),0);assert.equal(await db.userWordStatus.count({where:{userId:id}}),0);assert.equal(await db.xpLedger.count({where:{userId:id}}),0);
});
test('edit lineage stops a speculative offline revision from overwriting another device',async()=>{
    const id=await newUser('lineage'),first=randomUUID(),missed=randomUUID();
    const event=(eventId:string,revision:number,baseToken:string,status:'known'|'learning')=>({kind:'status',clientEventId:eventId,occurredAt:Date.now(),payload:{wordId:word,status,revision,baseToken}});
    await syncEvents(id,{deviceId:deviceA,events:[event(first,0,'','known')]});
    const result=await syncEvents(id,{deviceId:deviceB,events:[event(missed,0,'','learning'),event(randomUUID(),1,`${deviceB}:${missed}`,'learning')]});assert(result.results.every(x=>(x.result as {conflict?:boolean}).conflict));assert.equal((await readProgress(id)).snapshot['klar:vocabulary:v1']![word],'known');
    await syncEvents(id,{deviceId:deviceA,events:[event(randomUUID(),1,`${deviceA}:${first}`,'learning')]});assert.equal((await readProgress(id)).snapshot['klar:vocabulary:v1']![word],'learning');
});
test('late mistakes cannot undo recovery or invent resolved journal entries',async()=>{
    const id=await newUser('late-error'),base=Date.now()-3*86400000;
    const send=(correct:boolean,at:number)=>syncEvents(id,{deviceId:deviceA,events:[{kind:'attempt',clientEventId:randomUUID(),occurredAt:at,payload:{key:'late-error',domain:'verb',prompt:'p',answers:['a'],answer:correct?'a':'b',correct,explanation:'e'}}]});
    await send(false,base);await send(true,base+86400000);await send(false,base+3600000);await send(true,base+7200000);
    let m=await db.mistake.findUniqueOrThrow({where:{userId_key:{userId:id,key:'late-error'}}});assert.equal(m.failures,1);assert.equal(m.recovery,1);assert.equal(m.resolved,false);
    assert.equal((await db.dailySummary.findMany({where:{userId:id}})).flatMap(x=>x.resolved).length,0);await send(true,Date.now());m=await db.mistake.findUniqueOrThrow({where:{id:m.id}});assert.equal(m.resolved,true);assert.equal(m.recovery,2);
});
test('client journal remains bounded while account export retains all dated source summaries',async()=>{
    const id=await newUser('journal'),start=new Date('2025-01-01T00:00:00Z');await db.userSettings.create({data:{userId:id,journalStarted:start}});
    await db.dailySummary.createMany({data:Array.from({length:100},(_,i)=>({userId:id,day:new Date(start.getTime()+i*86400000),source:'LOCAL_IMPORT' as const,attempts:1,correct:1,words:[word],skills:[],resolved:[],lessons:[]}))});
    const current=(await readProgress(id)).snapshot['klar:learning:v1']!;assert(validLearning(current));assert(Object.keys(current.journal!.days).length<=92);assert.equal((await exportAccount(id)).summaries.length,100);
});
test('invalid counters, dates and duplicate settings reject before PostgreSQL writes',async()=>{
    const learning=emptyLearning();learning.skills[`recall:${word}`]={attempts:.5,correct:0,stage:0,due:Date.now(),last:0};await assert.rejects(importSnapshot(userC,input({'klar:learning:v1':learning})));
    learning.skills[`recall:${word}`].attempts=1;learning.skills[`recall:${word}`].due=1e100;await assert.rejects(importSnapshot(userC,input({'klar:learning:v1':learning})));await assert.rejects(importSnapshot(userC,input({'klar:vocabulary:levels:v1':['A1','A1']})));
});
test('offline XP maximum has its own provenance and does not add imported XP twice',async()=>{
    const id=await newUser('xp-source');await importSnapshot(id,input({'klar:xp:v1':100}));await syncEvents(id,{deviceId:deviceA,events:[{kind:'snapshot',clientEventId:randomUUID(),occurredAt:Date.now(),payload:{'klar:xp:v1':150}}]});assert.equal((await readProgress(id)).snapshot['klar:xp:v1'],150);const rows=await db.xpLedger.findMany({where:{userId:id}});assert(rows.some(x=>x.source==='OFFLINE'&&x.amount===150));assert(rows.some(x=>x.source==='LOCAL_IMPORT'&&x.amount===100));assert.equal(await db.rating.count({where:{userId:id}}),0);
});
test('account deletion removes private data and anonymizes finished competition history',async()=>{
    const id=await newUser('delete');await importSnapshot(id,input({'klar:xp:v1':50}));await setProfile(id,{handle:`u_${randomUUID().slice(0,8)}`,displayName:'Private',listed:true});
    const season=await db.season.create({data:{id:randomUUID(),startsAt:new Date(Date.now()-1000),endsAt:new Date(Date.now()+1000)}});const match=await db.match.create({data:{seasonId:season.id,mode:'WORD_CHOICE_RACE',level:'A1',ranked:false,status:'FINISHED',deadlineAt:new Date(),participants:{create:{userId:id,seat:0}}}});
    await deleteAccount(id);assert.equal(await db.user.findUnique({where:{id}}),null);assert.equal(await db.importBatch.count({where:{userId:id}}),0);assert.equal(await db.publicProfile.count({where:{userId:id}}),0);assert.equal((await db.matchParticipant.findFirstOrThrow({where:{matchId:match.id}})).userId,null);
});
test('owner hint prevents a stale tab syncing into another authenticated account',async()=>{
    const headers=await sessionHeaders(userB);headers.set('x-klar-owner',userA);let status=200;const res={setHeader:()=>{},status(code:number){status=code;return this;},json(){return this;}};await apiHandler({headers:Object.fromEntries(headers),query:{path:'sync'},method:'POST',body:{deviceId:deviceA,events:[]}} as never,res as never);assert.equal(status,409);
});
test('real HTTP routes serve signed sessions, no-store progress, origin checks and maintenance authentication',async()=>{
    const {createLocalServer}=await import('../../server/dev.ts');const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as {port:number};const root=`http://127.0.0.1:${address.port}/api`;
    try{
        const headers=await sessionHeaders(userB);const response=await fetch(root+'/progress',{headers});assert.equal(response.status,200);assert.match(response.headers.get('cache-control')??'',/private.*no-store/);
        const authResponse=await fetch(root+'/auth/get-session',{headers});assert.equal(authResponse.status,200);const session=await authResponse.json() as {user:{id:string}};assert.equal(session.user.id,userB);
        const unsafe=new Headers(headers);unsafe.set('origin','https://untrusted.invalid');unsafe.set('content-type','application/json');const rejected=await fetch(root+'/sync',{method:'POST',headers:unsafe,body:JSON.stringify({deviceId:deviceA,events:[]})});assert.equal(rejected.status,403);
        const unauthenticated=await fetch(root+'/progress');assert.equal(unauthenticated.status,401);const maintenance=await fetch(root+'/maintenance/expire');assert.equal(maintenance.status,401);
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test('all nineteen legacy keys survive import, device voices remain scoped and steps journal once',async()=>{
    const id=await newUser('all-keys'),learning=emptyLearning(),mini=miniLessons[0],at=Date.now(),d=studyDate(at);
    const snapshot={
        'klar:locale:v1':'uk','klar:dark':true,'klar:mastered:v1':['machen:0'],'klar:vocabulary:v1':{[word]:'known'},'klar:nouns:v1':[
            `${nouns[0].id}:article`,`${nouns[0].id}:plural`], 'klar:sentences:v1':['learn'],
        'klar:daily:v1':{[d]:{ruleRead:true,words:[word],nounsDone:true,sentenceDone:true}},'klar:course:v1':{[lesson]:{video:true,practice:true,note:'Заметка'}},'klar:activity:v1':{days:[d],words:[word]},'klar:achievements:v1':{'known-10':new Date().toISOString()},'klar:xp:v1':100,'klar:learning:v1':learning,'klar:phrases:v1':[{russian:'Привет',german:'Hallo',source:'library'}],
        'klar:learning:word-mode':'listening','klar:vocabulary:levels:v1':['A1','B1'],'klar:verb-level:v1':'B1','klar:verb-practice:length:v1':36,'klar:speech:voice':'device-a-voice','klar:speech:rate':.9
    };assert.equal(Object.keys(snapshot).length,19);await importSnapshot(id,input(snapshot));const read=(await readProgress(id,deviceA)).snapshot;
    for(const key of ['klar:locale:v1','klar:dark','klar:mastered:v1','klar:nouns:v1','klar:sentences:v1','klar:daily:v1','klar:course:v1','klar:learning:word-mode','klar:vocabulary:levels:v1','klar:verb-level:v1','klar:verb-practice:length:v1','klar:speech:voice','klar:speech:rate'])assert.deepEqual(read[key as keyof typeof read],snapshot[key as keyof typeof snapshot]);
    assert.equal((await readProgress(id,deviceB)).snapshot['klar:speech:voice'],undefined);
    const events=['dialogue','chunks','rule',...mini.tasks.map(t=>t.id)].map(stepId=>({kind:'step',clientEventId:randomUUID(),occurredAt:at,payload:{lessonId:mini.id,stepId}}));await syncEvents(id,{deviceId:deviceA,events});await syncEvents(id,{deviceId:deviceA,events});const summary=await db.dailySummary.findUniqueOrThrow({where:{userId_day_source:{userId:id,day:new Date(d+'T00:00:00Z'),source:'OFFLINE'}}});assert.deepEqual(summary.lessons,[mini.id]);assert.equal(summary.attempts,0);
});
