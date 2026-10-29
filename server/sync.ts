import { serial, lockUser } from './db.ts';
import { syncSchema, known } from './validation.ts';
import { mergeSnapshot, json, type ImportReport } from './import.ts';
import { readProgress } from './progress.ts';
import { applyAttempt, studyDate, completeLessonStep } from '../src/learning/model.ts';
export async function syncEvents(userId: string, raw: unknown) {
    const input = syncSchema.parse(raw);
    return serial(async (tx) => {
        await lockUser(tx, userId);
        await tx.device.upsert({where:{userId_clientId:{userId,clientId:input.deviceId}},create:{userId,clientId:input.deviceId},update:{}});
        const results = [];
        for (const event of input.events) {
            const where = { userId_deviceId_clientEventId: { userId, deviceId: input.deviceId, clientEventId: event.clientEventId } }, old = await tx.syncEvent.findUnique({ where });
            if (old) {
                results.push({ clientEventId: event.clientEventId, result: old.result });
                continue;
            }
            if (event.occurredAt > Date.now() + 300000 || event.occurredAt < 946684800000)
                throw Object.assign(new Error('Invalid event time'), { status: 400 });
            let result: unknown = { accepted: true };
            const changeToken=`${input.deviceId}:${event.clientEventId}`;
            if (event.kind === 'snapshot') {
                const report: ImportReport = { unknown: [], conflicts: [] };
                await mergeSnapshot(tx, userId, input.deviceId, event.payload, report, 'OFFLINE');
                result = report;
            }
            if (event.kind === 'settings') {
                const old = await tx.userSettings.findUnique({ where: { userId } });
                if (((old?.revision ?? 0) !== event.payload.revision || (old?.changeToken??'') !== event.payload.baseToken))
                    result = { conflict: true, current: old };
                else {
                    const values = event.payload.values;
                    const data = { locale: values['klar:locale:v1'], dark: values['klar:dark'], speechRate: values['klar:speech:rate'], wordMode: values['klar:learning:word-mode'], vocabularyLevels: values['klar:vocabulary:levels:v1'], verbLevel: values['klar:verb-level:v1'], practiceLength: values['klar:verb-practice:length:v1'] };
                    await tx.userSettings.upsert({ where: { userId }, create: { userId, ...data, changeToken, revision: 1 }, update: { ...data, changeToken, revision: { increment: 1 } } });
                }
            }
            if (event.kind === 'status') {
                const { wordId, status, revision } = event.payload;
                if (!known.words.has(wordId))
                    throw Object.assign(new Error('Unknown word'),{status:400});
                const where = { userId_wordId: { userId, wordId } }, old = await tx.userWordStatus.findUnique({ where });
                if (((old?.revision ?? 0) !== revision || (old?.changeToken??'') !== event.payload.baseToken))
                    result = { conflict: true, current: old };
                else
                    await tx.userWordStatus.upsert({ where, create: { userId, wordId, status, source: 'OFFLINE', changeToken, revision: 1 }, update: { status, changeToken, revision: { increment: 1 }, source: 'OFFLINE' } });
            }
            if (event.kind === 'note') {
                const { lessonId, note, revision } = event.payload;
                if (!known.videos.has(lessonId))
                    throw Object.assign(new Error('Unknown lesson'),{status:400});
                const where = { userId_lessonId: { userId, lessonId } }, old = await tx.userLessonProgress.findUnique({ where });
                if ((old?.revision ?? 0) !== revision)
                    result = { conflict: true, current: old };
                else
                    await tx.userLessonProgress.upsert({ where, create: { userId, lessonId, note, source: 'OFFLINE', changeToken, revision: 1 }, update: { note, changeToken, revision: { increment: 1 }, source: 'OFFLINE' } });
            }
            if (event.kind === 'step') {
                const { lessonId, stepId } = event.payload, required = known.lessons.get(lessonId);
                if (!required?.has(stepId))
                    throw Object.assign(new Error('Unknown step'), { status: 400 });
                const state = (await readProgress(userId, input.deviceId, tx)).snapshot['klar:learning:v1']!, next = completeLessonStep(state, lessonId, stepId, [...required], event.occurredAt);
                await tx.userLessonStep.upsert({ where: { userId_stepId: { userId, stepId: `${lessonId}:${stepId}` } }, create: { userId, stepId: `${lessonId}:${stepId}`, source: 'OFFLINE' }, update: {} });
                const dayString = studyDate(event.occurredAt), day = new Date(dayString + 'T00:00:00Z');
                await tx.studyDay.upsert({ where: { userId_day: { userId, day } }, create: { userId, day }, update: {} });
                const completed = next.journal?.days[dayString]?.lessons.filter(x => !state.journal?.days[dayString]?.lessons.includes(x)) ?? [];
                const where = { userId_day_source: { userId, day, source: 'OFFLINE' as const } }, summary = await tx.dailySummary.findUnique({ where });
                await tx.dailySummary.upsert({ where, create: { userId, day, source: 'OFFLINE', attempts: 0, correct: 0, words: [], skills: [], resolved: [], lessons: completed }, update: { lessons: [...new Set([...summary?.lessons ?? [], ...completed])] } });
                await tx.userSettings.upsert({ where: { userId }, create: { userId, journalStarted: day }, update: state.journal?.started && state.journal.started <= dayString ? {} : { journalStarted: day } });
            }
            if (event.kind === 'attempt') {
                const a = event.payload;
                if (a.wordId && !known.words.has(a.wordId))
                    throw Object.assign(new Error('Unknown word'),{status:400});
                const state = (await readProgress(userId, input.deviceId, tx)).snapshot['klar:learning:v1']!, at = event.occurredAt;
                const next = applyAttempt(state, a, event.clientEventId, at), key = a.wordId && a.mode ? `${a.mode}:${a.wordId}` : null, previous = key ? state.skills[key] : undefined;
                const late = !!previous && at < previous.last;
                if (key && a.wordId && a.mode) {
                    const value = next.skills[key], where = { userId_wordId_mode: { userId, wordId: a.wordId, mode: a.mode } }, data = { ...value, due: new Date(late ? previous!.due : value.due), last: new Date(late ? previous!.last : value.last), stage: late ? previous!.stage : value.stage, source: 'OFFLINE' as const };
                    await tx.userWordSkill.upsert({ where, create: { userId, wordId: a.wordId, mode: a.mode, ...data, revision: 1 }, update: { ...data, revision: { increment: 1 } } });
                }
                const m = next.mistakes[a.key], oldM = state.mistakes[a.key];
                const existingMistake=await tx.mistake.findUnique({where:{userId_key:{userId,key:a.key}},select:{lastEventAt:true}});
                const applyMistake=!!m&&(!existingMistake||at>=existingMistake.lastEventAt.getTime());
                if (m && applyMistake) {
                    const data = { ...m, lastWrong: new Date(m.lastWrong), lastEventAt:new Date(at), due: new Date(m.due), source: 'OFFLINE' as const };
                    const saved = await tx.mistake.upsert({ where: { userId_key: { userId, key: a.key } }, create: { userId, ...data, revision: 1 }, update: { ...data, revision: { increment: 1 } } });
                    if (a.correct)
                        await tx.mistakeRecovery.create({ data: { mistakeId: saved.id, eventId: `${userId}:${input.deviceId}:${event.clientEventId}`, at: new Date(at) } });
                }
                const day = new Date(studyDate(at) + 'T00:00:00Z');
                await tx.studyDay.upsert({ where: { userId_day: { userId, day } }, create: { userId, day }, update: {} });
                const sets = { words:a.correct&&a.wordId?[a.wordId]:[], skills:!late&&key&&next.skills[key].stage>=3&&(previous?.stage??0)<3?[key]:[], resolved:applyMistake&&m?.resolved&&!oldM?.resolved?[a.key]:[], lessons: [] as string[] };
                const summaryWhere = { userId_day_source: { userId, day, source: 'OFFLINE' as const } }, summary = await tx.dailySummary.findUnique({ where: summaryWhere });
                await tx.dailySummary.upsert({ where: summaryWhere, create: { userId, day, source: 'OFFLINE', attempts: 1, correct: Number(a.correct), ...sets }, update: { attempts: { increment: 1 }, correct: { increment: Number(a.correct) }, ...Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...new Set([...(summary?.[k as keyof typeof sets] ?? []), ...v])]])) } });
                await tx.userSettings.upsert({ where: { userId }, create: { userId, journalStarted: day }, update: state.journal?.started && state.journal.started <= studyDate(at) ? {} : { journalStarted: day } });
                if (a.correct && a.wordId)
                    await tx.userTestedWord.upsert({ where: { userId_wordId: { userId, wordId: a.wordId } }, create: { userId, wordId: a.wordId, source: 'OFFLINE' }, update: {} });
                result = { accepted: true, late, source: 'OFFLINE' };
            }
            await tx.syncEvent.create({ data: { userId, deviceId: input.deviceId, clientEventId: event.clientEventId, kind: event.kind, source: 'OFFLINE', occurredAt: new Date(event.occurredAt), payload: json(event.payload), result: json(result) } });
            results.push({ clientEventId: event.clientEventId, result });
        }
        return { results, ...await readProgress(userId, input.deviceId, tx) };
    });
}
