import { db, type Tx } from './db.ts';
import { emptyLearning, studyDate, type LearningState, type Mistake as LocalMistake } from '../src/learning/model.ts';
import type { Legacy } from './validation.ts';
export async function readProgress(userId: string, clientId?: string, tx: Tx | typeof db = db) {
    const [settings, statuses, skills, mastery, lessons, steps, plans, phrases, days, summaries, mistakes, awards, xp, tested, device] = await Promise.all([
        tx.userSettings.findUnique({ where: { userId } }), tx.userWordStatus.findMany({ where: { userId } }), tx.userWordSkill.findMany({ where: { userId } }), tx.userMastery.findMany({ where: { userId } }), tx.userLessonProgress.findMany({ where: { userId } }), tx.userLessonStep.findMany({ where: { userId }, include: { step: true } }), tx.userDailyPlan.findMany({ where: { userId }, include: { words: true } }), tx.savedPhrase.findMany({ where: { userId }, take: 20, orderBy: { id: 'asc' } }), tx.studyDay.findMany({ where: { userId }, orderBy: { day: 'asc' } }), tx.dailySummary.findMany({ where: { userId } }), tx.mistake.findMany({ where: { userId } }), tx.userAchievement.findMany({ where: { userId } }), tx.xpLedger.findMany({ where: { userId } }), tx.userTestedWord.findMany({ where: { userId } }), clientId ? tx.device.findUnique({ where: { userId_clientId: { userId, clientId } } }) : null,
    ]);
    const learning: LearningState = emptyLearning(), dayKey = (d: Date) => d.toISOString().slice(0, 10);
    for (const s of skills)
        learning.skills[`${s.mode}:${s.wordId}`] = { attempts: s.attempts, correct: s.correct, stage: s.stage, due: s.due.getTime(), last: s.last.getTime() };
    for (const m of mistakes) {
        const { id: _id, userId: _u, source: _s, revision: _r, lastEventAt:_e, ...v } = m;
        learning.mistakes[m.key] = JSON.parse(JSON.stringify({ ...v, lastWrong: m.lastWrong.getTime(), due: m.due.getTime(), wordId: m.wordId ?? undefined, mode: m.mode ?? undefined, lessonId: m.lessonId ?? undefined, audio: m.audio ?? undefined, caseSensitive: m.caseSensitive ?? undefined })) as LocalMistake;
    }
    for (const x of steps)
        (learning.lessons[x.step.lessonId] ??= []).push(x.step.legacyKey);
    learning.days = days.map(x => dayKey(x.day));
    if (settings?.journalStarted) {
        learning.journal = { started: dayKey(settings.journalStarted), days: {} };
        const cutoff=studyDate(Date.now()-90*86400000);
        for (const s of summaries.filter(s=>dayKey(s.day)>=cutoff)) {
            const k = dayKey(s.day), log = learning.journal.days[k] ??= { attempts: 0, correct: 0, words: [], skills: [], resolved: [], lessons: [] };
            log.attempts += s.attempts;
            log.correct += s.correct;
            for (const key of ['words', 'skills', 'resolved', 'lessons'] as const)
                log[key] = [...new Set([...log[key], ...s[key]])];
        }
    }
    const snapshot: Legacy = {
        'klar:mastered:v1': mastery.filter(x => x.exerciseId.startsWith('verb:')).map(x => x.exerciseId.slice(5)),
        'klar:nouns:v1': mastery.filter(x => x.exerciseId.startsWith('noun:')).map(x => x.exerciseId.slice(5)),
        'klar:sentences:v1': mastery.filter(x => x.exerciseId.startsWith('sentence:')).map(x => x.exerciseId.slice(9)),
        'klar:vocabulary:v1': Object.fromEntries(statuses.map(x => [x.wordId, x.status])),
        'klar:course:v1': Object.fromEntries(lessons.map(x => [x.lessonId, { video: x.video, practice: x.practice, note: x.note }])),
        'klar:daily:v1': Object.fromEntries(plans.map(x => [dayKey(x.day), { ruleRead: x.ruleRead, nounsDone: x.nounsDone, sentenceDone: x.sentenceDone, words: x.words.map(w => w.wordId) }])),
        'klar:activity:v1': { days: learning.days, words: tested.map(x => x.wordId) },
        'klar:achievements:v1': Object.fromEntries(awards.map(x => [x.tierId, x.earnedAt.toISOString()])),
        'klar:xp:v1': Math.max(0, ...xp.filter(x => ['legacy-maximum','offline-maximum'].includes(x.eventKey)).map(x => x.amount)) + xp.filter(x => !['legacy-maximum','offline-maximum'].includes(x.eventKey)).reduce((sum, x) => sum + x.amount, 0),
        'klar:learning:v1': learning, 'klar:phrases:v1': phrases.map(({ russian, german, source }) => ({ russian, german, source: source as 'library' | 'online' })),
        ...(settings ? { 'klar:locale:v1': settings.locale as 'ru' | 'uk', 'klar:dark': settings.dark, 'klar:speech:rate': settings.speechRate as .75 | .9 | 1, 'klar:learning:word-mode': settings.wordMode, 'klar:vocabulary:levels:v1': settings.vocabularyLevels as ('A1' | 'A2' | 'B1' | 'extra')[], 'klar:verb-level:v1': settings.verbLevel as 'all' | 'A1' | 'A2' | 'B1', 'klar:verb-practice:length:v1': settings.practiceLength as 12 | 24 | 36 } : {}),
        ...(device?.voiceURI ? { 'klar:speech:voice': device.voiceURI } : {}),
    };
    return { snapshot, revisions: { statuses: Object.fromEntries(statuses.map(x => [x.wordId, x.revision])), notes: Object.fromEntries(lessons.map(x => [x.lessonId, x.revision])), settings: settings?.revision ?? 0, statusTokens:Object.fromEntries(statuses.map(x=>[x.wordId,x.changeToken])), noteTokens:Object.fromEntries(lessons.map(x=>[x.lessonId,x.changeToken])),settingsToken:settings?.changeToken??'' } };
}
