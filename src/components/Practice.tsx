import ErrorExplanation from '../learning/ErrorExplanation';
import {TextInput} from './ui';
import { Button, Card, ProgressBar } from './ui';
import Select from './Select';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, Shuffle } from 'lucide-react';
import { pronouns, type Verb } from '../data/verbs';
import { makeVerbTasks, solvedVerbSentence } from '../data/verbPractice';
import { useStoredState } from '../hooks/useStoredState';
import { useLearning } from '../learning/LearningContext';
import { useLocale } from '../i18n/Locale';
export default function Practice({ verb, onCorrect }: {
    verb: Verb;
    onCorrect: (key: string) => void;
}) {
    const { t } = useLocale();
    const { record } = useLearning();
    const [limit, setLimit] = useStoredState('klar:verb-practice:length:v1', 24, (v): v is number => [12, 24, 36].includes(v as number));
    const [tasks, setTasks] = useState(() => makeVerbTasks(verb, limit)), [index, setIndex] = useState(0), [answer, setAnswer] = useState(''), [checked, setChecked] = useState(false), [score, setScore] = useState(0);
    const task = tasks[index];
    const correct = !!task && answer.trim().normalize('NFC').toLocaleLowerCase('de-DE') === task.answer.toLocaleLowerCase('de-DE');
    function restart(next = limit) { setTasks(makeVerbTasks(verb, next)); setIndex(0); setAnswer(''); setChecked(false); setScore(0); }
    function check(e: React.FormEvent) {
        e.preventDefault();
        if (!answer.trim() || checked || !task)
            return;
        setChecked(true);
        record({ key: `verb:${verb.id}:${task.person}`, domain: 'verb', prompt: `${verb.id} · ${pronouns[task.person]} · ${task.kind === 'form' ? 'Впишите форму' : task.sentence}`, answers: [task.answer], answer, correct, explanation: verb.rule });
        if (correct) {
            setScore(s => s + 1);
            onCorrect(`${verb.id}:${task.person}`);
        }
    }
    const toolbar = <div className="verb-practice-toolbar"><label>{t('Заданий за подход', 'Завдань за підхід')}<Select value={limit} onChange={e => { const count = Number(e.target.value); setLimit(count); restart(count); }}>{[12, 24, 36].map(n => <option value={n} key={n}>{n}</option>)}</Select></label><Button onClick={() => restart()} variant="secondary"><Shuffle size={15}/>{t('Новый подход', 'Новий підхід')}</Button></div>;
    if (!task)
        return <Card variant="plain" className="practice result" as="section">{toolbar}<CheckCircle2 size={40}/><h3>{t('Тренировка завершена!', 'Тренування завершено!')}</h3><p>{t('Правильно', 'Правильно')}: {score} / {tasks.length}. {t('Прогресс учитывает разные формы, а не количество повторов.', 'Прогрес враховує різні форми, а не кількість повторень.')}</p><Button onClick={() => restart()} variant="primary"><RotateCcw size={17}/>{t('Ещё один подход', 'Ще один підхід')}</Button></Card>;
    const heading = { form: t('Вспомните форму', 'Згадайте форму'), gap: t('Заполните пропуск', 'Заповніть пропуск'), question: t('Постройте вопрос', 'Побудуйте запитання'), correction: t('Исправьте ошибку', 'Виправте помилку') }[task.kind];
    return <Card variant="plain" className="practice" as="section">{toolbar}<div className="section-heading"><div><span className="eyebrow">{t('ЧЕТЫРЕ ВИДА ПРАКТИКИ', 'ЧОТИРИ ВИДИ ПРАКТИКИ')}</span><h3>{heading}</h3></div><span className="muted">{index + 1} / {tasks.length}</span></div><ProgressBar className="progress-track" fillStyle={{ width: `${index / tasks.length * 100}%` }}/><p className="verb-task-instruction">{task.kind === 'correction' ? t('В предложении неверная форма. Введите только исправленный глагол.', 'У реченні неправильна форма. Введіть лише виправлене дієслово.') : task.kind === 'form' ? t('Впишите форму глагола для указанного местоимения.', 'Впишіть форму дієслова для вказаного займенника.') : t('Введите только пропущенную форму глагола.', 'Введіть лише пропущену форму дієслова.')} <b>{verb.id}</b></p>{task.kind !== 'form' && <div className={`verb-context ${task.kind === 'correction' ? 'has-error' : ''}`} lang="de">{task.sentence}</div>}<form onSubmit={check}><div className="answer-row"><span className="question-pronoun">{pronouns[task.person]}</span><TextInput autoComplete="off" aria-label={t('Форма глагола', 'Форма дієслова')} value={answer} disabled={checked} onChange={e => setAnswer(e.target.value)} placeholder={t('Ваша форма…', 'Ваша форма…')}/><Button disabled={!answer.trim() || checked} variant="primary">{t('Проверить', 'Перевірити')}</Button></div><div aria-live="polite">{checked && <div className={`feedback ${correct ? 'success' : 'error'}`}><b>{correct ? t('Верно!', 'Правильно!') : t('Правильная форма', 'Правильна форма') + `: ${task.answer}`}</b><p lang="de">{solvedVerbSentence(task)}</p><p>{verb.rule}</p>{!correct&&<ErrorExplanation domain="verb" answer={answer} answers={[task.answer]}/>}</div>}</div></form>{checked && <Button onClick={() => { setIndex(i => i + 1); setAnswer(''); setChecked(false); }} className="next" variant="text">{index === tasks.length - 1 ? t('Посмотреть результат', 'Переглянути результат') : t('Следующий вопрос', 'Наступне запитання')}<ArrowRight size={16}/></Button>}<p className="course-caption">{t('24 разных задания на глагол: формы, пропуски, вопросы и исправление ошибок. В длинном подходе часть заданий повторяется в новом порядке.', '24 різні завдання на дієслово: форми, пропуски, запитання й виправлення помилок. У довгому підході частина завдань повторюється в новому порядку.')}</p></Card>;
}
