import ErrorExplanation from './ErrorExplanation';
import {TextInput} from '../components/ui';
import { Badge, Button, Card } from '../components/ui';
import { useEffect, useState } from 'react';
import { ArrowRight, Headphones, RotateCcw, Volume2 } from 'lucide-react';
import { vocabulary, type Word } from '../data/vocabulary';
import { nouns } from '../data/nouns';
import { wordLevel, wordLevels, validSelectedLevels, type WordLevel } from '../data/wordLevels';
import { shuffle } from '../data/vocabularyPractice';
import { useStoredState } from '../hooks/useStoredState';
import { useNow } from '../hooks/useNow';
import { useSpeech } from '../hooks/useSpeech';
import { useLocale } from '../i18n/Locale';
import { useLearning } from './LearningContext';
import { acceptedAnswer, acceptedSpelling, answerFeedback, reviewQueue, skillKey, skills, type SkillMode } from './model';
export const modeNames = { recognition: { ru: 'Узнаю слово', uk: 'Упізнаю слово' }, recall: { ru: 'Вспоминаю перевод', uk: 'Пригадую переклад' }, spelling: { ru: 'Пишу по-немецки', uk: 'Пишу німецькою' }, listening: { ru: 'Понимаю на слух', uk: 'Розумію на слух' } };
function translationAnswers(word: Word) { return [...new Set([word.translation, ...word.translation.split(/[,;•]|\s\/\s/).map(s => s.trim()).filter(Boolean)])]; }
export default function WordReview({ wordIds, initialMode }: {
    wordIds?: string[];
    initialMode?: SkillMode;
}) {
    const { locale, t } = useLocale();
    const { state, record } = useLearning();
    const [mode, setMode] = useStoredState<SkillMode>('klar:learning:word-mode', 'recall', (v): v is SkillMode => skills.includes(v as SkillMode));
    useEffect(() => {
        if (initialMode)
            setMode(initialMode);
    }, [initialMode, setMode]);
    const [levels, setLevels] = useStoredState<WordLevel[]>('klar:vocabulary:levels:v1', [...wordLevels], validSelectedLevels);
    const [session, setSession] = useState<Word[] | null>(null), [index, setIndex] = useState(0), [input, setInput] = useState(''), [checked, setChecked] = useState(false), [played, setPlayed] = useState(false), [score, setScore] = useState(0);
    const speech = useSpeech();
    const now = useNow();
    const pool = vocabulary.filter(w => wordIds ? wordIds.includes(w.id) : levels.includes(wordLevel(w.id)));
    const due = pool.filter(w => state.skills[skillKey(w.id, mode)]?.due <= now).length;
    const fresh = pool.filter(w => !state.skills[skillKey(w.id, mode)]).length;
    const word = session?.[index];
    const [options, setOptions] = useState<string[]>([]);
    const noun = word ? nouns.find(n => `${n.article} ${n.singular}` === word.word) : undefined;
    const answers = word ? (mode === 'recall' || mode === 'recognition' ? translationAnswers(word) : [word.word]) : [];
    const correct = (mode === 'spelling' || mode === 'listening' ? acceptedSpelling : acceptedAnswer)(input, answers);
    function prepare(word: Word | undefined) {
        setInput('');
        setChecked(false);
        setPlayed(false);
        speech.stop();
        if (word)
            setOptions(shuffle([word.translation, ...shuffle([...new Set(vocabulary.filter(w => w.translation !== word.translation).map(w => w.translation))]).slice(0, 3)]));
    }
    function start() { const queue = reviewQueue(shuffle(pool), state.skills, mode, Date.now(), 12); setSession(queue); setIndex(0); setScore(0); prepare(queue[0]); }
    function check(value = input) {
        if (checked || !word || !value.trim() || mode === 'listening' && !played)
            return;
        const right = (mode === 'spelling' || mode === 'listening' ? acceptedSpelling : acceptedAnswer)(value, answers);
        setInput(value);
        setChecked(true);
        if (right)
            setScore(n => n + 1);
        record({ key: `word:${mode}:${word.id}`, domain: 'word', wordId: word.id, mode, prompt: mode === 'spelling' ? word.translation : word.word, answers, answer: value, correct: right, audio: mode === 'listening' ? word.word : undefined, explanation: mode === 'spelling' || mode === 'listening' ? `Немецкое написание: ${word.word}. ${word.translation}.` : `${word.word} — ${word.translation}.` });
    }
    function next() { setIndex(i => i + 1); prepare(session?.[index + 1]); }
    async function listen(speed: number) {
        if (word && await speech.speak(word.word, speed))
            setPlayed(true);
    }
    return <><div className="learning-section-heading"><h2>{t('Возвращаем знания вовремя', 'Повертаємо знання вчасно')}</h2><p>{t('У каждого слова четыре независимых навыка. Сначала идут слова, срок повторения которых наступил, затем новые.', 'Кожне слово має чотири незалежні навички. Спочатку йдуть слова, час повторення яких настав, потім нові.')}</p></div><div className="learning-mode-grid">{skills.map(m => <button key={m} disabled={!!session} className={mode === m ? 'active' : ''} onClick={() => { setMode(m); speech.stop(); }}>{modeNames[m][locale]}</button>)}</div>{!session ? <>{!wordIds && <div className="word-level-chips">{wordLevels.map(l => <button key={l} disabled={!!wordIds} aria-pressed={levels.includes(l)} className={levels.includes(l) ? 'selected' : ''} onClick={() => setLevels(old => old.includes(l) ? old.filter(v => v !== l) : [...old, l])}>{l === 'extra' ? t('Дополнительно', 'Додатково') : l}</button>)}</div>}<div className="learning-review-summary"><span><b>{due}</b>{t('пора повторить', 'час повторити')}</span><span><b>{fresh}</b>{t('ещё не проверяли в этом навыке', 'ще не перевіряли в цій навичці')}</span><Button disabled={!due && !fresh} onClick={start} variant="primary"><RotateCcw size={17}/>{t('Начать · до 12 слов', 'Почати · до 12 слів')}</Button></div><p className="course-caption">{t('После верного ответа: повтор через 10 минут → 1 → 3 → 7 → 14 → 30 → 60 дней. После ошибки — через 10 минут. Это простое интервальное расписание, а не прогноз момента забывания.', 'Після правильної відповіді: повтор через 10 хвилин → 1 → 3 → 7 → 14 → 30 → 60 днів. Після помилки — через 10 хвилин. Це простий інтервальний розклад, а не прогноз моменту забування.')}</p>{!due && !fresh && <p className="learning-note">{t('На сейчас всё повторено. Выберите другой навык или вернитесь позже.', 'На зараз усе повторено. Виберіть іншу навичку або поверніться пізніше.')}</p>}</> : !word ? <section className="learning-finished"><h3>{t('Подход завершён', 'Підхід завершено')}</h3><p>{score} / {session.length}</p><p>{t('Следующее повторение назначено отдельно каждому слову.', 'Наступне повторення призначено окремо кожному слову.')}</p><Button onClick={() => setSession(null)} variant="primary">{t('К выбору навыка', 'До вибору навички')}</Button></section> : <Card className="learning-panel" as="section"><div className="section-heading"><Badge>{modeNames[mode][locale]}</Badge><span>{index + 1} / {session.length}</span><Button onClick={() => { setSession(null); speech.stop(); }} variant="text">{t('Закончить', 'Закінчити')}</Button></div>{mode === 'listening' ? <><h3><Headphones size={22}/>{t('Послушайте и напишите слово по-немецки', 'Послухайте й напишіть слово німецькою')}</h3><div className="learning-actions"><Button onClick={() => void listen(1)} variant="primary"><Volume2 size={18}/>1×</Button><Button onClick={() => void listen(.75)} variant="secondary">0,75×</Button></div><p className="course-caption">{t('Для существительного запишите также услышанный артикль. При отсутствии немецкого голоса выберите другой навык.', 'Для іменника запишіть також почутий артикль. Якщо немає німецького голосу, виберіть іншу навичку.')}</p></> : <><p className="learning-word-prompt" lang={mode === 'spelling' ? 'ru' : 'de'}>{mode === 'spelling' ? word.translation : word.word}</p><p>{mode === 'spelling' ? t('Напишите немецкое слово. У существительных нужен артикль.', 'Напишіть німецьке слово. Для іменників потрібен артикль.') : mode === 'recall' ? t('Вспомните перевод и напишите его по-русски.', 'Згадайте переклад і напишіть його російською.') : t('Выберите значение слова.', 'Виберіть значення слова.')}</p></>}
 {mode === 'recognition' ? <div className="quiz-options">{options.map(option => <button key={option} disabled={checked} onClick={() => check(option)}>{option}</button>)}</div> : <form onSubmit={e => { e.preventDefault(); check(); }}><label className="learning-answer-label">{t('Ваш ответ', 'Ваша відповідь')}<TextInput maxLength={1000} value={input} disabled={checked} onChange={e => setInput(e.target.value)} autoComplete="off" spellCheck={false}/></label><Button disabled={checked || !input.trim() || mode === 'listening' && !played} variant="primary">{t('Проверить', 'Перевірити')}</Button></form>}
 {checked && <div className={`feedback ${correct ? 'success' : 'error'}`} role="status"><b>{correct ? t('Верно', 'Правильно') : t('Сравните с карточкой', 'Порівняйте з карткою')}</b><p lang="de">{word.word}</p><p>{word.translation}</p>{noun && <p lang="de">{noun.article} {noun.singular} → die {noun.plural}</p>}{!correct&&<ErrorExplanation domain="word" answer={input} answers={answers}/>}<p>{t('Следующее повторение', 'Наступне повторення')}: {new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(state.skills[skillKey(word.id, mode)]?.due ?? Date.now()))}</p><Button onClick={next} variant="secondary">{t('Следующее слово', 'Наступне слово')}<ArrowRight size={15}/></Button></div>}{speech.message && <p className="speech-status" role="status">{t(speech.message)}</p>}</Card>}</>;
}
