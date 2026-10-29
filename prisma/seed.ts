import { createHash } from 'node:crypto';
import { db } from '../server/db.ts';
import { vocabulary } from '../src/data/vocabulary.ts';
import { wordLevel } from '../src/data/wordLevels.ts';
import { verbs } from '../src/data/verbs.ts';
import { makeVerbTasks } from '../src/data/verbPractice.ts';
import { nouns } from '../src/data/nouns.ts';
import { sentences, sentenceTokens } from '../src/data/sentences.ts';
import { courseLessons, courseLevels } from '../src/data/course.ts';
import { ruleTopics } from '../src/data/rules.ts';
import { miniLessons } from '../src/learning/lessons.ts';
import { achievementDefinitions } from '../src/data/achievements.ts';
import { achievementTracks, trackSteps } from '../src/data/achievementTracks.ts';
import type { Prisma } from '../server/generated/prisma/client.ts';
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
// Bound database pressure while avoiding one network round trip at a time.
async function each<T>(values:readonly T[],work:(value:T)=>Promise<void>){
    let index=0;
    const results=await Promise.allSettled(Array.from({length:Math.min(5,values.length)},async()=>{
        while(index<values.length){const value=values[index++];await work(value);}
    }));
    const failure=results.find(result=>result.status==='rejected');
    if(failure?.status==='rejected')throw failure.reason;
}
export async function seed() {
    await db.course.upsert({ where: { id: 'klar' }, create: { id: 'klar', title: 'Klar' }, update: { title: 'Klar' } });
    for (const level of courseLevels)
        await db.courseLevel.upsert({ where: { id: level }, create: { id: level, courseId: 'klar', cefr: level }, update: {} });
    await each(vocabulary,async word=>{
        const data = { legacyKey: word.id, german: word.word, reading: word.reading, category: word.category, level: wordLevel(word.id) };
        await db.word.upsert({ where: { id: word.id }, create: { id: word.id, ...data }, update: data });
        await db.wordTranslation.upsert({ where: { wordId_language: { wordId: word.id, language: 'ru' } }, create: { wordId: word.id, language: 'ru', text: word.translation }, update: { text: word.translation } });
    });
    async function exercise(id: string, domain: string, prompt: string, answers: string[], publicData: unknown, level?: string) {
        await db.exercise.upsert({ where: { id }, create: { id, legacyKey: id, domain, level }, update: {} });
        const checksum = createHash('sha256').update(JSON.stringify({ prompt, answers, publicData })).digest('hex'), versionId = `${id}@${checksum}`;
        await db.exerciseVersion.upsert({ where: { id: versionId }, create: { id: versionId, exerciseId: id, checksum, prompt, publicData: json(publicData), answers: { create: [...new Set(answers)].map(answer => ({ answer })) } }, update: {} });
    }
    await each(verbs,async verb=>{
        await db.verb.upsert({ where: { id: verb.id }, create: { id: verb.id, level: verb.level, content: json(verb) }, update: { level: verb.level, content: json(verb) } });
        for (let person = 0; person < 6; person++) {
            const id = `${verb.id}:${person}`, data = { verbId: verb.id, person, german: verb.forms[person], translation: verb.translations[person] };
            await db.verbForm.upsert({ where: { id }, create: { id, ...data }, update: data });
            await exercise(`verb:${id}`, 'verb', id, [verb.forms[person]], {}, verb.level);
        }
        for (const task of makeVerbTasks(verb, 24, () => .5))
            await exercise(`verb-task:${task.key}`, 'verb', task.sentence, [task.answer], { kind: task.kind, person: task.person }, verb.level);
    });
    await each(nouns,async noun=>{
        await db.nounForm.upsert({ where: { id: noun.id }, create: noun, update: noun });
        for (const mode of ['article', 'plural'] as const)
            await exercise(`noun:${noun.id}:${mode}`, 'noun', noun.singular, [noun[mode]], { mode });
    });
    await each(sentences,async s=>{
        await exercise(`sentence:${s.id}`, 'sentence', s.translation, [s.german, ...s.alternatives ?? []], { tokens: sentenceTokens(s), hint: s.hint, explanation: s.explanation, topic: s.topic });
    });
    await each(vocabulary,async word=>{
        await exercise(`word:${word.id}`, 'word', word.word, [word.translation], { wordId: word.id }, wordLevel(word.id));
    });
    await each(courseLessons,async lesson=>{
        await db.lesson.upsert({ where: { id: lesson.id }, create: { id: lesson.id, legacyKey: lesson.id, levelId: lesson.level, kind: 'video', title: lesson.sourceTitle, content: json(lesson) }, update: { title: lesson.sourceTitle, content: json(lesson) } });
    });
    for (const lesson of miniLessons) {
        await db.lesson.upsert({ where: { id: lesson.id }, create: { id: lesson.id, legacyKey: lesson.id, levelId: lesson.level, kind: 'mini', title: lesson.title.ru, content: json(lesson) }, update: { content: json(lesson) } });
        for (const key of ['dialogue', 'chunks', 'rule', ...lesson.tasks.map(t => t.id)]) {
            const id = `${lesson.id}:${key}`;
            await db.lessonStep.upsert({ where: { id }, create: { id, lessonId: lesson.id, legacyKey: key, content: json(lesson.tasks.find(t => t.id === key) ?? { kind: key }) }, update: {} });
        }
        for (const task of lesson.tasks)
            await exercise(`lesson:${lesson.id}:${task.id}`, 'lesson', task.prompt.ru, task.answers, { audio: task.audio, caseSensitive: task.caseSensitive }, lesson.level);
    }
    for (const topic of ruleTopics)
        await db.ruleTopic.upsert({ where: { id: topic.id }, create: { id: topic.id, content: json(topic) }, update: { content: json(topic) } });
    for (const track of achievementTracks) {
        await db.achievementDefinition.upsert({ where: { id: track.id }, create: { id: track.id, title: track.ru }, update: {} });
        await each(trackSteps(track, 36500),async threshold=>{
            await db.achievementTier.upsert({ where: { id: `${track.prefix}-${threshold}` }, create: { id: `${track.prefix}-${threshold}`, definitionId: track.id, threshold }, update: {} });
        });
    }
    for (const a of achievementDefinitions) {
        await db.achievementDefinition.upsert({ where: { id: a.metric }, create: { id: a.metric, title: a.title }, update: {} });
        await db.achievementTier.upsert({ where: { id: a.id }, create: { id: a.id, definitionId: a.metric, threshold: a.target }, update: {} });
    }
    // Old streak IDs must remain importable even where today's UI uses new tiers.
    await each(Array.from({length:3647},(_,i)=>40+i*10),async n=>{
        await db.achievementTier.upsert({ where: { id: `streak-${n}` }, create: { id: `streak-${n}`, definitionId: 'streak', threshold: n }, update: {} });
    });
    return { words: vocabulary.length, verbs: verbs.length, nouns: nouns.length, sentences: sentences.length, videos: courseLessons.length, miniLessons: miniLessons.length };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prisma/seed.ts'))
    try {
        console.log(await seed());
    }
    finally {
        await db.$disconnect();
    }
