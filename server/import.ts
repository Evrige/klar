import { serial, lockUser, type Tx } from './db.ts';
import { hash } from './hash.ts';
import { known, unknownIds, importSchema, type Legacy } from './validation.ts';
import type { Prisma, SkillMode, Source } from './generated/prisma/client.ts';
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
const date = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export type ImportReport = {
    unknown: ReturnType<typeof unknownIds>;
    conflicts: {
        kind: string;
        key: string;
        resolution: string;
    }[];
};
class PreviewResult extends Error {
    constructor(readonly report:ImportReport){super('Import preview rollback');}
}
export async function previewSnapshot(userId:string,raw:unknown){
    const input=importSchema.parse(raw),report:ImportReport={unknown:unknownIds(input.snapshot),conflicts:[]};
    try{await serial(async tx=>{await lockUser(tx,userId);await mergeSnapshot(tx,userId,input.deviceId,input.snapshot,report,'LOCAL_IMPORT');throw new PreviewResult(report);});}
    catch(error){if(error instanceof PreviewResult)return {keys:Object.keys(input.snapshot),...error.report};throw error;}
    throw new Error('Preview must roll back');
}
export async function importSnapshot(userId: string, raw: unknown) {
    const input = importSchema.parse(raw), checksum = hash({ schemaVersion: 1, snapshot: input.snapshot });
    return serial(async (tx) => {
        await lockUser(tx, userId);
        const old = await tx.importBatch.findUnique({ where: { userId_checksum: { userId, checksum } } });
        if (old)
            return { id: old.id, ...old.report as object, duplicate: true };
        const report: ImportReport = { unknown: unknownIds(input.snapshot), conflicts: [] };
        const batch = await tx.importBatch.create({ data: { userId, deviceId: input.deviceId, schemaVersion: 1, checksum, snapshot: json(input.snapshot), report: json(report) } });
        await mergeSnapshot(tx, userId, input.deviceId, input.snapshot, report, 'LOCAL_IMPORT');
        if (report.unknown.length)
            await tx.importMapping.createMany({ data: report.unknown.map(i => ({ batchId: batch.id, ...i, targetId: null, reason: 'Unknown legacy ID retained in snapshot' })), skipDuplicates: true });
        await tx.importBatch.update({ where: { id: batch.id }, data: { report: json(report) } });
        return { id: batch.id, ...report };
    });
}
export async function mergeSnapshot(tx: Tx, userId: string, deviceId: string, s: Legacy, report: ImportReport, source: Source) {
    const conflict = (kind: string, key: string) => report.conflicts.push({ kind, key, resolution: 'keep-server; incoming retained in snapshot/event' });
    await tx.device.upsert({ where: { userId_clientId: { userId, clientId: deviceId } }, create: { userId, clientId: deviceId, voiceURI: s['klar:speech:voice'] }, update: source==='OFFLINE'&&s['klar:speech:voice']!==undefined?{voiceURI:s['klar:speech:voice']}:{} });
    const l = s['klar:learning:v1'];
    const settings = { locale: s['klar:locale:v1'], dark: s['klar:dark'], speechRate: s['klar:speech:rate'], wordMode: s['klar:learning:word-mode'], vocabularyLevels: s['klar:vocabulary:levels:v1'], verbLevel: s['klar:verb-level:v1'], practiceLength: s['klar:verb-practice:length:v1'], journalStarted: l?.journal ? date(l.journal.started) : undefined };
    const existing = await tx.userSettings.findUnique({ where: { userId } });
    if (!existing)
        await tx.userSettings.create({ data: { userId, ...settings } });
    else {
        for (const [key, value] of Object.entries(settings))
            if (value !== undefined && key !== 'journalStarted' && JSON.stringify(value) !== JSON.stringify(existing[key as keyof typeof existing]))
                conflict('setting', key);
        if (settings.journalStarted && (!existing.journalStarted || settings.journalStarted < existing.journalStarted))
            await tx.userSettings.update({ where: { userId }, data: { journalStarted: settings.journalStarted } });
    }
    const oldStatuses = new Map((await tx.userWordStatus.findMany({ where: { userId } })).map(x => [x.wordId, x]));
    const statuses = Object.entries(s['klar:vocabulary:v1'] ?? {}).filter(([id]) => known.words.has(id));
    for (const [id, status] of statuses)
        if (oldStatuses.has(id) && oldStatuses.get(id)!.status !== status)
            conflict('status', id);
    if (statuses.length)
        await tx.userWordStatus.createMany({ data: statuses.filter(([id]) => !oldStatuses.has(id)).map(([wordId, status]) => ({ userId, wordId, status, source })), skipDuplicates: true });
    const mastered = [['verb', s['klar:mastered:v1'] ?? [], known.verbs], ['noun', s['klar:nouns:v1'] ?? [], known.nouns], ['sentence', s['klar:sentences:v1'] ?? [], known.sentences]] as const;
    const mastery = mastered.flatMap(([kind, values, set]) => values.filter(id => set.has(id)).map(id => ({ userId, exerciseId: `${kind}:${id}`, source })));
    if (mastery.length)
        await tx.userMastery.createMany({ data: mastery, skipDuplicates: true });
    for (const [lessonId, r] of Object.entries(s['klar:course:v1'] ?? {})) {
        if (!known.videos.has(lessonId))
            continue;
        const where = { userId_lessonId: { userId, lessonId } }, old = await tx.userLessonProgress.findUnique({ where });
        if (old) {
            if (old.note !== r.note)
                conflict('note', lessonId);
            await tx.userLessonProgress.update({ where, data: { video: old.video || r.video, practice: old.practice || r.practice, note: old.revision === 0 ? (old.note || r.note) : old.note } });
        }
        else
            await tx.userLessonProgress.create({ data: { userId, lessonId, ...r, source } });
    }
    for (const [d, r] of Object.entries(s['klar:daily:v1'] ?? {})) {
        const day = date(d), where = { userId_day: { userId, day } }, old = await tx.userDailyPlan.findUnique({ where });
        const plan = await tx.userDailyPlan.upsert({ where, create: { userId, day, ruleRead: r.ruleRead, nounsDone: r.nounsDone, sentenceDone: r.sentenceDone }, update: { ruleRead: !!old?.ruleRead || r.ruleRead, nounsDone: !!old?.nounsDone || r.nounsDone, sentenceDone: !!old?.sentenceDone || r.sentenceDone } });
        for (const wordId of r.words)
            if (known.words.has(wordId))
                await tx.userDailyPlanWord.upsert({ where: { planId_wordId: { planId: plan.id, wordId } }, create: { planId: plan.id, wordId }, update: {} });
    }
    for (const p of s['klar:phrases:v1'] ?? []) {
        const checksum = hash(p);
        await tx.savedPhrase.upsert({ where: { userId_checksum: { userId, checksum } }, create: { userId, checksum, ...p }, update: {} });
    }
    const days = union(s['klar:activity:v1']?.days ?? [], l?.days ?? []);
    if (days.length)
        await tx.studyDay.createMany({ data: days.map(d => ({ userId, day: date(d) })), skipDuplicates: true });
    const tested = (s['klar:activity:v1']?.words ?? []).filter(id => known.words.has(id));
    if (tested.length)
        await tx.userTestedWord.createMany({ data: tested.map(wordId => ({ userId, wordId, source })), skipDuplicates: true });
    for (const [tierId, at] of Object.entries(s['klar:achievements:v1'] ?? {})) {
        if (!await tx.achievementTier.findUnique({ where: { id: tierId } }))
            await tx.achievementTier.create({ data: { id: tierId, definitionId: 'streak', threshold: Number(tierId.split('-').at(-1)) } });
        const where = { userId_tierId: { userId, tierId } }, old = await tx.userAchievement.findUnique({ where });
        await tx.userAchievement.upsert({ where, create: { userId, tierId, earnedAt: new Date(at), source }, update: { earnedAt: old && old.earnedAt < new Date(at) ? old.earnedAt : new Date(at) } });
    }
    const xp = s['klar:xp:v1'];
    if (xp !== undefined) {
        const eventKey=source==='LOCAL_IMPORT'?'legacy-maximum':'offline-maximum';
        const where = { userId_eventKey: { userId, eventKey } }, old = await tx.xpLedger.findUnique({ where });
        await tx.xpLedger.upsert({ where, create: { userId, eventKey, amount: xp, source }, update: { amount: Math.max(old?.amount ?? 0, xp) } });
    }
    if (!l)
        return;
    const oldSkills = new Map((await tx.userWordSkill.findMany({ where: { userId } })).map(v => [`${v.mode}:${v.wordId}`, v]));
    const skills = Object.entries(l.skills).flatMap(([key, v]) => { const mode = key.slice(0, key.indexOf(':')) as SkillMode, wordId = key.slice(key.indexOf(':') + 1); if (!known.words.has(wordId))
        return []; const old = oldSkills.get(key); if (old && (old.stage !== v.stage || old.due.getTime() !== v.due))
        conflict('srs', key); return [{ userId, wordId, mode, ...v, due: new Date(v.due), last: new Date(v.last), source }]; });
    const newSkills = skills.filter(v => !oldSkills.has(`${v.mode}:${v.wordId}`));
    for (let i = 0; i < newSkills.length; i += 1000)
        await tx.userWordSkill.createMany({ data: newSkills.slice(i, i + 1000), skipDuplicates: true });
    const bounds = skills.filter(v => oldSkills.has(`${v.mode}:${v.wordId}`)).map(v => ({ wordId: v.wordId, mode: v.mode, attempts: v.attempts, correct: v.correct }));
    if (bounds.length)
        await tx.$executeRaw `UPDATE "UserWordSkill" s SET attempts=greatest(s.attempts,v.attempts),correct=greatest(s.correct,v.correct) FROM jsonb_to_recordset(${JSON.stringify(bounds)}::jsonb) AS v("wordId" text,mode text,attempts int,correct int) WHERE s."userId"=${userId} AND s."wordId"=v."wordId" AND s.mode::text=v.mode AND s.source='LOCAL_IMPORT' AND s.revision=0`;
    const oldMistakes = new Set((await tx.mistake.findMany({ where: { userId }, select: { key: true } })).map(v => v.key));
    for (const key of Object.keys(l.mistakes))
        if (oldMistakes.has(key))
            conflict('mistake', key);
    const mistakes = Object.values(l.mistakes).filter(m => !oldMistakes.has(m.key)).map(m => ({ userId, ...m, source, lastWrong: new Date(m.lastWrong), lastEventAt:new Date(Math.max(m.lastWrong,m.recovery>0?m.due-86400000:0)), due: new Date(m.due) }));
    for (let i = 0; i < mistakes.length; i += 500)
        await tx.mistake.createMany({ data: mistakes.slice(i, i + 500), skipDuplicates: true });
    const steps = Object.entries(l.lessons).flatMap(([lessonId, values]) => values.filter(key => known.lessons.get(lessonId)?.has(key)).map(key => ({ userId, stepId: `${lessonId}:${key}`, source })));
    if (steps.length)
        await tx.userLessonStep.createMany({ data: steps, skipDuplicates: true });
    if (l.processed.length)
        await tx.syncEvent.createMany({ data: l.processed.map(marker => ({ userId, deviceId, clientEventId: `legacy:${marker}`, source: 'LOCAL_IMPORT' as const, kind: 'legacy-marker', occurredAt: new Date(0), payload: { marker }, result: { imported: true } })), skipDuplicates: true });
    for (const [d, v] of Object.entries(l.journal?.days ?? {})) {
        const day = date(d), where = { userId_day_source: { userId, day, source: 'LOCAL_IMPORT' as const } }, old = await tx.dailySummary.findUnique({ where });
        await tx.dailySummary.upsert({ where, create: { userId, day, source: 'LOCAL_IMPORT', ...v }, update: old ? { attempts: Math.max(old.attempts, v.attempts), correct: Math.max(old.correct, v.correct), words: union(old.words, v.words), skills: union(old.skills, v.skills), resolved: union(old.resolved, v.resolved), lessons: union(old.lessons, v.lessons) } : {} });
    }
}
