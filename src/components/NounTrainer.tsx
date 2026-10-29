import {TextInput} from './ui';
import { Button, PageIntro, ProgressBar } from './ui';
import { useLearning } from '../learning/LearningContext';
import NounGuide from './NounGuide';
import { useLocale } from '../i18n/Locale';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { nouns, isCorrectPlural, type Noun, type NounMode } from '../data/nouns';
import { shuffle } from '../data/vocabularyPractice';
import { useSpeech } from '../hooks/useSpeech';
export function NounQuiz({ questions, mode, onAnswer, onComplete }: {
    questions: Noun[];
    mode: NounMode;
    onAnswer: (key: string, correct: boolean) => void;
    onComplete?: (score: number) => void;
}) {
    const { t: _ui } = useLocale();
    const { record } = useLearning();
    const [index, setIndex] = useState(0), [input, setInput] = useState(''), [checked, setChecked] = useState(false), [results, setResults] = useState<boolean[]>([]);
    const speech = useSpeech();
    const noun = questions[index];
    const score = results.filter(Boolean).length;
    function check(value: string) {
        if (checked || !noun)
            return;
        const correct = mode === 'article' ? value === noun.article : isCorrectPlural(noun, value);
        record({ key: `noun:${noun.id}:${mode}`, domain: 'noun', prompt: mode === 'article' ? `Артикль: ${noun.singular}` : `Множественное число: ${noun.article} ${noun.singular}`, answers: mode === 'article' ? [noun.article] : [noun.plural, `die ${noun.plural}`], answer: value, correct, explanation: noun.tip });
        setInput(value);
        setChecked(true);
        setResults(old => [...old.slice(0, index), correct]);
        onAnswer(`${noun.id}:${mode}`, correct);
    }
    function next() {
        if (index === questions.length - 1)
            onComplete?.(score);
        setIndex(i => i + 1);
        setChecked(false);
        setInput('');
        speech.stop();
    }
    if (!noun)
        return <div className="exercise-result"><CheckCircle2 size={39}/><h2>{_ui("Практика завершена")}</h2><p>{_ui("Правильно: ")}{_ui(score)} {_ui(" из ")}{_ui(questions.length)}.</p><p className="muted">{_ui("Повторяйте слово вместе с артиклем и множественным числом.")}</p></div>;
    return <section className="exercise-card noun-exercise"><div className="section-heading"><span className="eyebrow">{_ui(mode === 'article' ? 'ВЫБЕРИТЕ АРТИКЛЬ' : 'НАПИШИТЕ МНОЖЕСТВЕННОЕ ЧИСЛО')}</span><span className="muted">{_ui(index + 1)} / {_ui(questions.length)}</span></div><ProgressBar className="progress-track" fillStyle={{ width: `${index / questions.length * 100}%` }}/><div className="noun-prompt"><p className="muted">{_ui(noun.translation)}</p><h2 lang="de">{_ui(mode === 'article' ? <span className="article-blank">?</span> : <span className={`article-color ${noun.article}`}>{_ui(noun.article)}</span>)} {_ui(noun.singular)}</h2>{_ui(mode === 'plural' && <Button onClick={() => speech.speak(`${noun.article} ${noun.singular}`)} variant="speech"><Volume2 size={17}/> {_ui(" Прослушать")}</Button>)}</div>{_ui(mode === 'article' ? <div className="article-choices">{_ui((['der', 'die', 'das'] as const).map(article => <button key={article} disabled={checked} className={`article-choice ${article} ${checked && article === noun.article ? 'correct-answer' : ''} ${checked && input === article && article !== noun.article ? 'wrong-answer' : ''}`} onClick={() => check(article)}>{_ui(article)}</button>))}</div> : <form className="plural-form" onSubmit={e => {
                e.preventDefault();
                if (input.trim())
                    check(input);
            }}><label><span>die</span><TextInput aria-label={_ui("Множественное число")} autoComplete="off" placeholder={_ui("Например: Bücher")} value={input} disabled={checked} onChange={e => setInput(e.target.value)}/></label><Button disabled={checked || !input.trim()} variant="primary">{_ui("Проверить")}</Button><div className="umlaut-keys" aria-label={_ui("Немецкие буквы")}>{_ui(['ä', 'ö', 'ü', 'ß'].map(letter => <button type="button" disabled={checked} key={letter} onClick={() => setInput(old => old + letter)}>{_ui(letter)}</button>))}</div></form>)}<div aria-live="polite">{_ui(checked && <div className={`exercise-feedback ${results[index] ? 'is-correct' : 'is-wrong'}`}><b>{_ui(results[index] ? 'Верно!' : `Правильно: ${mode === 'article' ? noun.article : noun.plural}`)}</b><div className="noun-paradigm"><span lang="de"><b className={`article-color ${noun.article}`}>{_ui(noun.article)}</b> {_ui(noun.singular)}</span><ArrowRight size={18}/><span lang="de"><b>die</b> {_ui(noun.plural)}</span><Button aria-label={_ui("Озвучить обе формы")} onClick={() => speech.speak(`${noun.article} ${noun.singular}. Die ${noun.plural}.`)} variant="icon"><Volume2 size={17}/></Button></div><p>{_ui(noun.tip)}</p><Button onClick={next} variant="primary">{_ui(index === questions.length - 1 ? 'Завершить' : 'Следующее слово')}<ArrowRight size={16}/></Button></div>)}</div>{_ui(speech.message && <p className="speech-status" role="status">{_ui(speech.message)}</p>)}</section>;
}
export default function NounTrainer({ mastered, onAnswer, onRules }: {
    onRules?: () => void;
    mastered: string[];
    onAnswer: (key: string, correct: boolean) => void;
}) {
    const { t: _ui } = useLocale();
    const [mode, setMode] = useState<NounMode>('article'), [session, setSession] = useState(() => shuffle(nouns).slice(0, 10)), [run, setRun] = useState(0);
    function restart(next = mode) { setMode(next); setSession(shuffle(nouns).slice(0, 10)); setRun(r => r + 1); }
    return <><PageIntro><span className="eyebrow">{_ui("ГРАММАТИКА · СУЩЕСТВИТЕЛЬНЫЕ")}</span><h1>{_ui("Учите слово целиком")}<span>.</span></h1><p>{_ui("Артикль, значение и множественное число. В базе: ")}{_ui(nouns.length)} {_ui(" слов. По 10 случайных заданий за подход.")}</p></PageIntro><NounGuide onRules={onRules}/><div className="trainer-summary"><span><b>{_ui(mastered.filter(k => k.endsWith(':article')).length)} / {_ui(nouns.length)}</b> {_ui(" артиклей закреплено")}</span><span><b>{_ui(mastered.filter(k => k.endsWith(':plural')).length)} / {_ui(nouns.length)}</b> {_ui(" форм множественного числа")}</span></div><div className="trainer-toolbar"><div className="rules-nav"><button className={mode === 'article' ? 'active' : ''} onClick={() => restart('article')}>der / die / das</button><button className={mode === 'plural' ? 'active' : ''} onClick={() => restart('plural')}>{_ui("Множественное число")}</button></div><Button onClick={() => restart()} variant="secondary"><RotateCcw size={15}/> {_ui(" Новый подход")}</Button></div><NounQuiz key={`${mode}:${run}`} questions={session} mode={mode} onAnswer={onAnswer}/><div className="rule-note"><p>{_ui("Во множественном числе определённый артикль в Nominativ — ")}<b>die</b> {_ui(" для всех родов. Само существительное может получить -e, -(e)n, -er, -s, умлаут или остаться без изменений. Поэтому учим пары: das Buch → die Bücher.")}</p></div></>;
}
