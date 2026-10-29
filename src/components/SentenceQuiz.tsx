import ErrorExplanation from '../learning/ErrorExplanation';
import {TextInput} from './ui';
import { Button, ProgressBar } from './ui';
import { useLearning } from '../learning/LearningContext';
import { useLocale } from '../i18n/Locale';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Undo2, Volume2 } from 'lucide-react';
import { sentenceTokens, isCorrectSentence, type Sentence } from '../data/sentences';
import { shuffle } from '../data/vocabularyPractice';
import { useSpeech } from '../hooks/useSpeech';
import WordBreakdown from './WordBreakdown';
export function SentenceQuiz({ questions, onAnswer, onComplete }: {
    questions: Sentence[];
    onAnswer: (id: string, correct: boolean) => void;
    onComplete?: (score: number) => void;
}) {
    const { t: _ui } = useLocale();
    const { record } = useLearning();
    const [mode, setMode] = useState<'bank' | 'write'>('bank'), [typed, setTyped] = useState('');
    const [index, setIndex] = useState(0), [selected, setSelected] = useState<number[]>([]), [checked, setChecked] = useState(false), [results, setResults] = useState<boolean[]>([]);
    const [banks] = useState(() => questions.map(s => shuffle(sentenceTokens(s))));
    const speech = useSpeech();
    const current = questions[index];
    const score = results.filter(Boolean).length;
    if (!current)
        return <div className="exercise-result"><CheckCircle2 size={39}/><h2>{_ui("Предложения собраны")}</h2><p>{_ui("Правильно: ")}{_ui(score)} {_ui(" из ")}{_ui(questions.length)}.</p><p className="muted">{_ui("Каждая конструкция — ещё один шаг к собственной речи.")}</p></div>;
    const tokens = sentenceTokens(current), bank = banks[index];
    const words = mode === 'write' ? typed.trim().split(/\s+/) : selected.map(id => tokens.find(t => t.id === id)!.text);
    function check() {
        if (checked || (mode === 'bank' ? selected.length !== tokens.length : !typed.trim()))
            return;
        const correct = isCorrectSentence(current, words);
        record({ key: `sentence:${current.id}:${current.german}`, domain: 'sentence', prompt: `${current.translation} ${current.hint}`, answers: [current.german, ...(current.alternatives ?? [])], answer: words.join(' '), correct, explanation: current.explanation });
        setChecked(true);
        setResults(old => [...old.slice(0, index), correct]);
        onAnswer(current.id, correct);
    }
    function next() {
        if (index === questions.length - 1)
            onComplete?.(score);
        setIndex(i => i + 1);
        setSelected([]);
        setTyped('');
        setChecked(false);
        speech.stop();
    }
    return <section className="exercise-card sentence-exercise"><div className="section-heading"><span className="eyebrow">{_ui("СОБЕРИТЕ ПРЕДЛОЖЕНИЕ")}</span><span className="muted">{_ui(index + 1)} / {_ui(questions.length)}</span></div><ProgressBar className="progress-track" fillStyle={{ width: `${index / questions.length * 100}%` }}/><h2 className="sentence-prompt">{_ui(current.translation)}</h2><p className="sentence-hint">{_ui(current.hint)}</p><div className="learning-task-tabs"><button className={mode === 'bank' ? 'active' : ''} disabled={checked} onClick={() => setMode('bank')}>{_ui('Из готовых слов', 'Із готових слів')}</button><button className={mode === 'write' ? 'active' : ''} disabled={checked} onClick={() => setMode('write')}>{_ui('Написать самому', 'Написати самостійно')}</button></div>{mode === 'write' && <label className="learning-answer-label">{_ui('Ваше предложение по-немецки', 'Ваше речення німецькою')}<TextInput value={typed} disabled={checked} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false}/></label>}<div hidden={mode === 'write'} className="assembled-sentence" aria-label={_ui("Ваше предложение")}>{_ui(selected.length ? selected.map(id => <button key={id} disabled={checked} aria-label={_ui(`Убрать слово ${tokens[id].text}`)} onClick={() => setSelected(old => old.filter(i => i !== id))}>{_ui(tokens[id].text)}</button>) : <span>{_ui("Нажимайте на слова в нужном порядке…")}</span>)}</div><div hidden={mode === 'write'} className="word-bank" aria-label={_ui("Доступные слова")}>{_ui(bank.map(token => <button key={token.id} disabled={checked || selected.includes(token.id)} onClick={() => setSelected(old => [...old, token.id])}>{_ui(token.text)}</button>))}</div><div className="builder-actions"><Button disabled={checked || !selected.length} onClick={() => setSelected(old => old.slice(0, -1))} variant="secondary"><Undo2 size={15}/> {_ui(" Назад")}</Button><Button disabled={checked || !selected.length} onClick={() => setSelected([])} variant="secondary">{_ui("Очистить")}</Button><Button disabled={checked || (mode === 'bank' ? selected.length !== tokens.length : !typed.trim())} onClick={check} variant="primary">{_ui("Проверить")}</Button></div><p className="punctuation-note">{_ui("Нажмите на выбранное слово, чтобы вернуть его. Знаки препинания покажем в готовом ответе.")}</p><div aria-live="polite">{_ui(checked && <div className={`exercise-feedback ${results[index] ? 'is-correct' : 'is-wrong'}`}><b>{_ui(results[index] ? 'Верно!' : 'Посмотрите правильный порядок:')}</b><div className="sentence-answer"><p lang="de">{_ui(current.german)}</p><Button aria-label={_ui("Прослушать предложение")} onClick={() => speech.speak(current.german)} variant="icon"><Volume2 size={19}/></Button></div><p>{_ui(current.explanation)}</p>{!results[index]&&<ErrorExplanation domain="sentence" answer={words.join(' ')} answers={[current.german,...(current.alternatives??[])]}/>}<WordBreakdown german={current.german}/>{mode === 'write' && <p className="course-caption">{_ui('Проверка по подготовленным вариантам; другие верные формулировки могут не распознаваться.', 'Перевірка за підготовленими варіантами; інші правильні формулювання можуть не розпізнаватися.')}</p>}<Button onClick={next} variant="primary">{_ui(index === questions.length - 1 ? 'Завершить' : 'Следующее предложение')}<ArrowRight size={16}/></Button></div>)}</div>{_ui(speech.message && <p className="speech-status" role="status">{_ui(speech.message)}</p>)}</section>;
}
