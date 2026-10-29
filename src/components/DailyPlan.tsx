import {Badge, Button, Card, PageIntro, ProgressBar} from './ui';
import { useLocale } from '../i18n/Locale';
import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Eye, Layers, Volume2 } from 'lucide-react';
import { makeDailyPlan, type DailyRecord } from '../data/dailyPlan';
import type { WordStatus } from '../data/vocabulary';
import { NounQuiz } from './NounTrainer';
import { SentenceQuiz } from './SentenceTrainer';
import { useSpeech } from '../hooks/useSpeech';
export default function DailyPlan({ date, record, onUpdate, onWord, onNoun, onSentence, onRules }: {
    date: string;
    record: DailyRecord;
    onUpdate: (update: (previous: DailyRecord) => DailyRecord) => void;
    onWord: (id: string, status: WordStatus) => void;
    onNoun: (id: string, correct: boolean) => void;
    onSentence: (id: string, correct: boolean) => void;
    onRules: () => void;
}) {
    const { t: _ui, locale } = useLocale();
    const plan = useMemo(() => makeDailyPlan(date), [date]);
    const [step, setStep] = useState(0), [wordIndex, setWordIndex] = useState(0), [revealed, setRevealed] = useState(false);
    const speech = useSpeech();
    const reviewed = plan.words.filter(w => record.words.includes(w.id)).length;
    const completed = [record.ruleRead, reviewed === 5, record.nounsDone && record.sentenceDone];
    const count = completed.filter(Boolean).length;
    const word = plan.words[wordIndex];
    const rule = plan.topic.tables[0];
    function mark(status: WordStatus) { onWord(word.id, status); onUpdate(old => ({ ...old, words: old.words.includes(word.id) ? old.words : [...old.words, word.id] })); setRevealed(false); const unseen = plan.words.findIndex(w => w.id !== word.id && !record.words.includes(w.id)); setWordIndex(unseen === -1 ? (wordIndex + 1) % 5 : unseen); speech.stop(); }
    const dateLabel = new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' }).format(new Date(`${date}T12:00:00Z`));
    return <><PageIntro><span className="eyebrow">{_ui("НЕБОЛЬШАЯ ПРИВЫЧКА · БОЛЬШОЙ РЕЗУЛЬТАТ")}</span><h1>{_ui("10 минут для немецкого")}<span>.</span></h1><p>{_ui(dateLabel)} {_ui(" · Время ориентировочное. План обновляется ежедневно по времени Берлина.")}</p></PageIntro><div className="daily-overview"><div><Clock3 size={28}/><h2>{_ui(count === 3 ? 'На сегодня готово!' : `Выполнено ${count} из 3 шагов`)}</h2></div><ProgressBar className="progress-track" fillStyle={{ width: `${count / 3 * 100}%` }}/><p>{_ui(count === 3 ? 'Отличная работа. Завтра здесь будет новый набор слов и заданий.' : 'Можно делать шаги в удобном порядке. Результаты сохраняются в этом браузере.')}</p></div><div className="daily-steps">{[{ label: 'Одно правило', time: '≈ 2 минуты', icon: BookOpen }, { label: 'Пять слов', time: '≈ 4 минуты', icon: Layers }, { label: 'Короткая практика', time: '≈ 4 минуты', icon: CheckCircle2 }].map((s, i) => <button key={s.label} className={step === i ? 'current' : ''} aria-pressed={step === i} onClick={() => { setStep(i); speech.stop(); }}><span className="daily-step-number">{completed[i] ? <Check size={18}/> : i + 1}</span><span><b>{_ui(s.label)}</b><small>{_ui(s.time)}</small></span></button>)}</div>
 {step === 0 ? <Card className="daily-content" as="section"><Badge>{_ui(plan.topic.title)}</Badge><h2>{_ui(rule.title)}</h2>{rule.intro && <p className="daily-intro">{_ui(rule.intro)}</p>}<div className="table-wrap"><table><caption className="sr-only">{_ui(rule.title)}</caption><thead><tr>{rule.columns.map(c => <th scope="col" key={c}>{_ui(c)}</th>)}</tr></thead><tbody>{rule.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{_ui(cell)}</td>)}</tr>)}</tbody></table></div>{rule.note && <p className="daily-intro">{_ui(rule.note)}</p>}<div className="daily-actions"><Button disabled={record.ruleRead} onClick={() => onUpdate(old => ({ ...old, ruleRead: true }))} variant="primary">{record.ruleRead ? <><Check size={16}/> {_ui(" Разобрано")}</> : <>{_ui("Правило понятно ")}<Check size={16}/></>}</Button><Button onClick={onRules} variant="secondary">{_ui("Полный справочник ")}<ArrowRight size={16}/></Button></div></Card> :
            step === 1 ? <Card className="daily-content" as="section"><div className="section-heading"><h2>{_ui("Пять слов на сегодня")}</h2><span className="muted">{_ui("Отмечено: ")}{_ui(reviewed)} / 5</span></div><div className="daily-word-tabs">{plan.words.map((w, i) => <button key={w.id} aria-label={_ui(`Слово ${i + 1}${record.words.includes(w.id) ? ', повторено' : ''}`)} aria-pressed={wordIndex === i} onClick={() => { setWordIndex(i); setRevealed(false); speech.stop(); }}>{record.words.includes(w.id) ? <Check size={16}/> : i + 1}</button>)}</div><div className="daily-word"><Badge>{_ui(word.category)}</Badge><h2 lang="de">{_ui(word.word)}</h2><p className="muted">[{_ui(word.reading)}{_ui("] · приблизительно")}</p><Button onClick={() => speech.speak(word.word)} variant="speech"><Volume2 size={17}/> {_ui(" Прослушать")}</Button><button className={`translation-toggle ${revealed ? 'revealed' : ''}`} aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? word.translation : <><Eye size={18}/> {_ui(" Показать перевод")}</>}</button><div className="word-decisions"><button className="learning-button" onClick={() => mark('learning')}><Layers size={17}/> {_ui(" Ещё учу")}</button><Button onClick={() => mark('known')} variant="primary"><Check size={17}/> {_ui(" Знаю")}</Button></div></div>{reviewed === 5 && <div className="daily-completed"><CheckCircle2 size={21}/><p>{_ui("Все пять слов повторены. Знакомые — в «Знаю», остальные — в «Изучаю».")}</p></div>}</Card> :
                <div className="daily-practice"><div className="section-heading"><div><h2>{_ui("Два артикля и одно предложение")}</h2><p className="muted">{_ui("Ошибаться можно: после каждого ответа будет объяснение.")}</p></div></div>{!record.nounsDone ? <NounQuiz questions={plan.nouns} mode="article" onAnswer={onNoun} onComplete={() => onUpdate(old => ({ ...old, nounsDone: true }))}/> : <div className="daily-completed"><CheckCircle2 size={21}/><p>{_ui("Артикли повторены.")}</p></div>}{record.nounsDone && !record.sentenceDone && <SentenceQuiz questions={[plan.sentence]} onAnswer={onSentence} onComplete={() => onUpdate(old => ({ ...old, sentenceDone: true }))}/>}{record.nounsDone && record.sentenceDone && <div className="daily-completed"><CheckCircle2 size={21}/><p>{_ui("Короткая практика выполнена. Правильные ответы учтены в общем прогрессе.")}</p></div>}</div>}
 {speech.message && <p className="speech-status" role="status">{_ui(speech.message)}</p>}{count === 3 && <div className="daily-finish"><CheckCircle2 size={27}/><div><h3>{_ui("Сегодня вы сделали шаг вперёд.")}</h3><p>{_ui("Правило разобрано, слова повторены, практика пройдена.")}</p></div></div>}</>;
}
