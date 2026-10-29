import {TextInput} from '../components/ui';
import { Badge, Button, Card, ProgressBar } from '../components/ui';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Headphones, Lightbulb, Volume2 } from 'lucide-react';
import { miniLessons, lessonCompleted, type MiniLesson, type LessonTask } from './lessons';
import { useLearning } from './LearningContext';
import { acceptedAnswer, acceptedSpelling, answerFeedback } from './model';
import { useLocale } from '../i18n/Locale';
import { useSpeech } from '../hooks/useSpeech';
import WordReview from './WordReview';
import VoiceRecorder from './VoiceRecorder';
export default function MiniLessons({ initial }: {
    initial?: string;
}) {
    const { state } = useLearning();
    const { t, locale } = useLocale();
    const [selected, setSelected] = useState<string | null>(initial ?? null);
    const lesson = miniLessons.find(l => l.id === selected);
    if (lesson)
        return <LessonView key={lesson.id} lesson={lesson} onBack={() => setSelected(null)} onNext={() => { const next = miniLessons[miniLessons.indexOf(lesson) + 1]; setSelected(next?.id ?? null); }}/>;
    return <><div className="learning-section-heading"><h2>{t('Уроки для реальных ситуаций', 'Уроки для реальних ситуацій')}</h2><p>{t('Слушаем диалог → учим выражения → понимаем правило → отвечаем сами. Это отдельная программа Klar; она не заменяет видеокурс автора.', 'Слухаємо діалог → вивчаємо вирази → розуміємо правило → відповідаємо самі. Це окрема програма Klar; вона не замінює відеокурс автора.')}</p></div><div className="mini-lesson-grid">{miniLessons.map((l, i) => { const done = lessonCompleted(l, state.lessons[l.id] ?? []); const count = (state.lessons[l.id] ?? []).filter(id => ['dialogue', 'chunks', 'rule', ...l.tasks.map(t => t.id)].includes(id)).length; return <button key={l.id} className={`mini-lesson-card ${done ? 'complete' : ''}`} onClick={() => setSelected(l.id)}><Badge>{l.level} · {i + 1}</Badge>{done ? <CheckCircle2 size={23}/> : <BookOpen size={23}/>}<h3>{l.title[locale]}</h3><p>{l.goal[locale]}</p><ProgressBar className="progress-track" fillStyle={{ width: `${count / 6 * 100}%` }}/><small>{done ? t('Учебные задания выполнены', 'Навчальні завдання виконано') : `${count} / 6`}</small><ArrowRight size={18}/></button>; })}</div></>;
}
function LessonView({ lesson, onBack, onNext }: {
    lesson: MiniLesson;
    onBack: () => void;
    onNext: () => void;
}) {
    const { t, locale } = useLocale();
    const { state, complete } = useLearning();
    const speech = useSpeech();
    const [practice, setPractice] = useState(0);
    const done = state.lessons[lesson.id] ?? [];
    const finished = lessonCompleted(lesson, done);
    return <><Button onClick={onBack} variant="text"><ArrowLeft size={17}/>{t('Все мини-уроки', 'Усі мініуроки')}</Button><section className="learning-lesson-intro"><Badge>{lesson.level}</Badge><h2>{lesson.title[locale]}</h2><p>{lesson.goal[locale]}</p></section><Card className="learning-panel" as="section"><h3><Headphones size={20}/>{t('1. Послушайте и прочитайте', '1. Послухайте й прочитайте')}</h3><div className="learning-actions"><Button onClick={() => speech.speak(lesson.dialogue.map(d => d.de).join(' '), 1)} variant="primary"><Volume2 size={17}/>{t('Весь диалог', 'Увесь діалог')}</Button><Button onClick={() => speech.speak(lesson.dialogue.map(d => d.de).join(' '), .75)} variant="secondary">{t('Медленно · 0,75×', 'Повільно · 0,75×')}</Button></div>{lesson.dialogue.map((line, i) => <div className="learning-dialogue" key={i}><span>{line.who}</span><div><p lang="de">{line.de}</p><small>{line[locale]}</small></div><Button aria-label={t('Прослушать реплику', 'Прослухати репліку')} onClick={() => speech.speak(line.de)} variant="icon"><Volume2 size={18}/></Button></div>)}<Button onClick={() => complete(lesson.id, 'dialogue')} variant="secondary">{done.includes('dialogue') ? <CheckCircle2 size={16}/> : null}{t('Диалог разобран', 'Діалог опрацьовано')}</Button></Card>
 <Card className="learning-panel" as="section"><h3>{t('2. Запомните выражения целиком', '2. Запам’ятайте вирази повністю')}</h3><div className="learning-chunks">{lesson.chunks.map(chunk => <article key={chunk.de}><b lang="de">{chunk.de}</b><p>{chunk[locale]}</p><Button onClick={() => speech.speak(chunk.de)} variant="text"><Volume2 size={15}/>{t('Послушать', 'Послухати')}</Button></article>)}</div><Button onClick={() => complete(lesson.id, 'chunks')} variant="secondary">{done.includes('chunks') ? <CheckCircle2 size={16}/> : null}{t('Выражения повторены', 'Вирази повторено')}</Button></Card>
 <details className="learning-backup"><summary>{t('Слова этого урока: карточки и интервальное повторение', 'Слова цього уроку: картки й інтервальне повторення')}</summary><WordReview wordIds={lesson.words}/></details><Card className="learning-panel" as="section"><h3><Lightbulb size={20}/>{t('3. Одно правило', '3. Одне правило')}</h3><p className="learning-prose">{lesson.rule[locale]}</p><Button onClick={() => complete(lesson.id, 'rule')} variant="secondary">{done.includes('rule') ? <CheckCircle2 size={16}/> : null}{t('Правило понятно', 'Правило зрозуміле')}</Button></Card>
 <Card className="learning-panel" as="section"><h3>{t('4. Отвечайте самостоятельно', '4. Відповідайте самостійно')}</h3><div className="learning-task-tabs">{lesson.tasks.map((task, i) => <button key={task.id} className={practice === i ? 'active' : ''} onClick={() => setPractice(i)}>{done.includes(task.id) && <CheckCircle2 size={14}/>} {i + 1} · {task.kind === 'listen' ? t('Слушать', 'Слухати') : task.kind === 'gap' ? t('Вставить', 'Вставити') : t('Написать', 'Написати')}</button>)}</div><LessonExercise key={lesson.tasks[practice].id} lesson={lesson} task={lesson.tasks[practice]} onNext={() => setPractice(i => Math.min(i + 1, lesson.tasks.length - 1))}/></Card>
 <Card className="learning-panel" as="section"><h3>{t('5. Скажите вслух', '5. Скажіть уголос')}</h3><p className="learning-prose">{lesson.pronunciation[locale]}</p><p className="learning-prose">{t('Повторите реплику за образцом. Затем замените имя, город, напиток или время своими данными.', 'Повторіть репліку за зразком. Потім замініть ім’я, місто, напій або час власними даними.')}</p><VoiceRecorder /></Card>{finished && <section className="learning-finished"><CheckCircle2 size={30}/><h3>{t('Первый круг пройден', 'Перше коло пройдено')}</h3><p>{t('Вы выполнили учебные задания. Вернитесь к фразам завтра без подсказок: один проход ещё не означает устойчивого владения.', 'Ви виконали навчальні завдання. Поверніться до фраз завтра без підказок: один прохід ще не означає стійкого володіння.')}</p><Button onClick={onNext} variant="primary">{t('Следующий урок', 'Наступний урок')}<ArrowRight size={17}/></Button></section>}{speech.message && <p className="speech-status" role="status">{t(speech.message)}</p>}</>;
}
function LessonExercise({ lesson, task, onNext }: {
    lesson: MiniLesson;
    task: LessonTask;
    onNext: () => void;
}) {
    const { t, locale } = useLocale();
    const { record, complete } = useLearning();
    const speech = useSpeech();
    const [input, setInput] = useState(''), [checked, setChecked] = useState(false), [hint, setHint] = useState(false), [played, setPlayed] = useState(false), [fallback, setFallback] = useState(false);
    const correct = task.caseSensitive ? task.answers.includes(input.trim()) : (task.kind === 'write' ? acceptedSpelling : acceptedAnswer)(input, task.answers);
    const canAnswer = task.kind !== 'listen' || played || fallback;
    async function listen(speed: number) {
        const started = await speech.speak(task.audio!, speed);
        if (started)
            setPlayed(true);
    }
    function check() {
        if (checked || !input.trim() || !canAnswer)
            return;
        setChecked(true);
        record({ key: `lesson:${lesson.id}:${task.id}`, domain: 'lesson', lessonId: lesson.id, prompt: task.prompt[locale], answers: task.answers, answer: input, correct, caseSensitive: task.caseSensitive, audio: task.kind === 'listen' && !fallback ? task.audio : undefined, explanation: task.explanation[locale] });
        if (correct)
            complete(lesson.id, task.id);
    }
    return <div className="learning-exercise"><h4>{task.prompt[locale]}</h4>{task.kind === 'listen' && <><div className="learning-actions"><Button onClick={() => void listen(1)} variant="primary"><Volume2 size={17}/>{t('Слушать · 1×', 'Слухати · 1×')}</Button><Button onClick={() => void listen(.75)} variant="secondary">{t('Медленно', 'Повільно')}</Button><Button onClick={() => setFallback(true)} variant="text">{t('Прочитать вместо аудирования', 'Прочитати замість аудіювання')}</Button></div>{fallback && <div className="learning-note"><p lang="de">{task.audio}</p><small>{t('Вы работаете с текстом. Этот ответ не подтверждает понимание на слух.', 'Ви працюєте з текстом. Ця відповідь не підтверджує розуміння на слух.')}</small></div>}{speech.message && <p role="status" className="speech-status">{t(speech.message)}</p>}</>}
 <form onSubmit={e => { e.preventDefault(); check(); }}><label className="learning-answer-label">{t('Ваш ответ', 'Ваша відповідь')}<TextInput maxLength={1000} value={input} onChange={e => setInput(e.target.value)} disabled={checked} autoComplete="off" spellCheck={false}/></label><div className="learning-actions"><Button disabled={checked || !input.trim() || !canAnswer} variant="primary">{t('Проверить', 'Перевірити')}</Button><Button type="button" onClick={() => setHint(!hint)} variant="secondary">{t('Подсказка', 'Підказка')}</Button></div></form>{hint && <p className="learning-note">{task.hint[locale]}</p>}{checked && <div className={`feedback ${correct ? 'success' : 'error'}`} role="status"><b>{correct ? t('Верно', 'Правильно') : t('Пока не совпало с подготовленными вариантами', 'Поки не збіглося з підготовленими варіантами')}</b><p>{correct ? task.explanation[locale] : task.caseSensitive ? t('Проверьте заглавную букву: вежливое Ihnen пишется с большой.', 'Перевірте велику літеру: ввічливе Ihnen пишеться з великої.') : t(answerFeedback(input, task.answers, 'lesson'))}</p><p lang="de">{task.answers[0]}</p>{!correct && <p>{task.explanation[locale]}</p>}<div className="learning-actions">{correct ? <Button onClick={onNext} variant="secondary">{t('Дальше', 'Далі')}</Button> : <Button onClick={() => { setChecked(false); setInput(''); }} variant="secondary">{t('Попробовать ещё раз', 'Спробувати ще раз')}</Button>}</div></div>}<p className="course-caption">{t('Проверка по подготовленным ответам. Возможны другие верные формулировки: отсутствие совпадения не всегда означает грамматическую ошибку.', 'Перевірка за підготовленими відповідями. Можливі інші правильні формулювання: відсутність збігу не завжди означає граматичну помилку.')}</p></div>;
}
