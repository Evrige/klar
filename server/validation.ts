import { z } from 'zod';
import { validLearning } from '../src/learning/model.ts';
import { vocabulary } from '../src/data/vocabulary.ts';
import { verbs } from '../src/data/verbs.ts';
import { nounKeys } from '../src/data/nouns.ts';
import { sentences } from '../src/data/sentences.ts';
import { courseLessons } from '../src/data/course.ts';
import { miniLessons } from '../src/learning/lessons.ts';
import { validEarned } from '../src/data/achievements.ts';
const str = z.string().max(2000), ids = z.array(str).max(10000), day = z.iso.date();
const record = <T extends z.ZodType>(v: T) => z.record(str, v).refine(v => Object.keys(v).length <= 20000);
const daily = z.object({ ruleRead: z.boolean(), words: ids, nounsDone: z.boolean(), sentenceDone: z.boolean() }).strict();
const lesson = z.object({ video: z.boolean(), practice: z.boolean(), note: z.string().max(10000) }).strict();
const counter=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
const timestamp=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<=253402300799999;
const learningSchema=z.custom<import('../src/learning/model.ts').LearningState>(validLearning).refine(v=>{
    if(!validLearning(v))return false;
    if(Object.keys(v.skills).length>10000||Object.keys(v.mistakes).length>10000||Object.keys(v.lessons).length>1000||v.days.length>36500)return false;
    if(!Object.entries(v.skills).every(([key,s])=>key.length<=2000&&counter(s.attempts)&&counter(s.correct)&&timestamp(s.due)&&timestamp(s.last)))return false;
    if(!Object.values(v.mistakes).every(m=>counter(m.failures)&&counter(m.recovery)&&timestamp(m.lastWrong)&&timestamp(m.due)&&m.answers.length<=30&&[m.key,m.prompt,m.answer,m.explanation,...m.answers,m.wordId??'',m.lessonId??'',m.audio??''].every(x=>x.length<=10000)))return false;
    return Object.entries(v.lessons).every(([id,steps])=>id.length<=2000&&steps.length<=200&&steps.every(s=>s.length<=2000))&&v.processed.every(id=>id.length<=2000);
},'Learning payload exceeds supported limits');
export const legacySchema = z.object({
    'klar:locale:v1': z.enum(['ru', 'uk']).optional(),
    'klar:dark': z.boolean().optional(),
    'klar:mastered:v1': ids.optional(),
    'klar:vocabulary:v1': record(z.enum(['known', 'learning'])).optional(),
    'klar:nouns:v1': ids.optional(),
    'klar:sentences:v1': ids.optional(),
    'klar:daily:v1': z.record(day, daily).optional(),
    'klar:course:v1': record(lesson).optional(),
    'klar:activity:v1': z.object({ days: z.array(day).max(36500), words: ids }).strict().optional(),
    'klar:achievements:v1': z.custom<Record<string, string>>(validEarned).refine(v=>validEarned(v)&&Object.keys(v).length<=5000&&Object.entries(v).every(([id,at])=>id.length<=2000&&timestamp(Date.parse(at)))).optional(),
    'klar:xp:v1': z.number().int().min(0).max(100000000).optional(),
    'klar:learning:v1': learningSchema.optional(),
    'klar:phrases:v1': z.array(z.object({ russian: z.string().max(500), german: z.string().max(3000), source: z.enum(['library', 'online']) }).strict()).max(20).optional(),
    'klar:learning:word-mode': z.enum(['recognition', 'recall', 'spelling', 'listening']).optional(),
    'klar:vocabulary:levels:v1': z.array(z.enum(['A1', 'A2', 'B1', 'extra'])).max(4).refine(v=>new Set(v).size===v.length).optional(),
    'klar:verb-level:v1': z.enum(['all', 'A1', 'A2', 'B1']).optional(),
    'klar:verb-practice:length:v1': z.union([z.literal(12), z.literal(24), z.literal(36)]).optional(),
    'klar:speech:voice': z.string().max(2000).optional(),
    'klar:speech:rate': z.union([z.literal(.75), z.literal(.9), z.literal(1)]).optional(),
}).strict();
export type Legacy = z.infer<typeof legacySchema>;
export const importSchema = z.object({ schemaVersion: z.literal(1), deviceId: z.uuid(), snapshot: legacySchema }).strict();
export const known = { words: new Set(vocabulary.map(x => x.id)), verbs: new Set(verbs.flatMap(v => v.forms.map((_, i) => `${v.id}:${i}`))), nouns: nounKeys, sentences: new Set(sentences.map(x => x.id)), videos: new Set(courseLessons.map(x => x.id)), lessons: new Map(miniLessons.map(l => [l.id, new Set(['dialogue', 'chunks', 'rule', ...l.tasks.map(t => t.id)])])) };
export function unknownIds(s: Legacy) {
    const issues: {
        kind: string;
        legacyKey: string;
    }[] = [];
    const check = (kind: string, values: string[], set: Set<string>) => { for (const id of values)
        if (!set.has(id))
            issues.push({ kind, legacyKey: id }); };
    check('word', Object.keys(s['klar:vocabulary:v1'] ?? {}), known.words);
    check('verb', s['klar:mastered:v1'] ?? [], known.verbs);
    check('noun', s['klar:nouns:v1'] ?? [], known.nouns);
    check('sentence', s['klar:sentences:v1'] ?? [], known.sentences);
    check('video', Object.keys(s['klar:course:v1'] ?? {}), known.videos);
    for (const d of Object.values(s['klar:daily:v1'] ?? {}))
        check('daily-word', d.words, known.words);
    check('activity-word', s['klar:activity:v1']?.words ?? [], known.words);
    const l = s['klar:learning:v1'];
    if (l) {
        for (const k of Object.keys(l.skills))
            check('skill', [k.slice(k.indexOf(':') + 1)], known.words);
        for (const [id, steps] of Object.entries(l.lessons)) {
            if (!known.lessons.has(id))
                issues.push({ kind: 'lesson', legacyKey: id });
            else
                check('step', steps, known.lessons.get(id)!);
        }
        for (const m of Object.values(l.mistakes)) {
            if (m.wordId)
                check('mistake-word', [m.wordId], known.words);
            if (m.lessonId && !known.lessons.has(m.lessonId))
                issues.push({ kind: 'mistake-lesson', legacyKey: m.lessonId });
        }
    }
    return [...new Map(issues.map(i => [`${i.kind}:${i.legacyKey}`, i])).values()];
}
export const syncSchema = z.object({ deviceId: z.uuid(), events: z.array(z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('attempt'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: z.object({ key: str, domain: z.enum(['word', 'verb', 'sentence', 'noun', 'lesson']), prompt: str, answers: z.array(str).min(1).max(30), answer: z.string().max(10000), correct: z.boolean(), explanation: z.string().max(10000), wordId: str.optional(), mode: z.enum(['recognition', 'recall', 'spelling', 'listening']).optional(), lessonId: str.optional(), audio: str.optional(), caseSensitive: z.boolean().optional() }).strict() }).strict(),
        z.object({ kind: z.literal('status'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: z.object({ wordId: str, status: z.enum(['known', 'learning']), revision: z.number().int().nonnegative(), baseToken:z.string().max(200).default('') }).strict() }).strict(),
        z.object({ kind: z.literal('note'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: z.object({ lessonId: str, note: z.string().max(10000), revision: z.number().int().nonnegative(), baseToken:z.string().max(200).default('') }).strict() }).strict(),
        z.object({ kind: z.literal('step'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: z.object({ lessonId: str, stepId: str }).strict() }).strict(),
        z.object({ kind: z.literal('snapshot'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: legacySchema }).strict(),
        z.object({ kind: z.literal('settings'), clientEventId: z.uuid(), occurredAt: z.number().int().nonnegative(), payload: z.object({ revision: z.number().int().nonnegative(), baseToken:z.string().max(200).default(''), values: legacySchema.pick({ 'klar:locale:v1': true, 'klar:dark': true, 'klar:speech:rate': true, 'klar:learning:word-mode': true, 'klar:vocabulary:levels:v1': true, 'klar:verb-level:v1': true, 'klar:verb-practice:length:v1': true }).refine(v => Object.keys(v).length > 0) }).strict() }).strict(),
    ])).max(50) }).strict();
