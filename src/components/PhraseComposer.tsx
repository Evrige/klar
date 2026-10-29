import {Badge, Button, Card} from './ui';
import { useLocale } from '../i18n/Locale';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Languages, LoaderCircle, Puzzle, Volume2 } from 'lucide-react';
import { phraseExamples, translateRussian, type TranslationResult } from '../lib/translate';
import type { Sentence } from '../data/sentences';
import { useSpeech } from '../hooks/useSpeech';
import { useStoredState } from '../hooks/useStoredState';
import SpeechSettings from './SpeechSettings';
import { SentenceQuiz } from './SentenceQuiz';
type SavedPhrase = {
    russian: string;
    german: string;
    source: 'library' | 'online';
};
const validHistory = (v: unknown): v is SavedPhrase[] => Array.isArray(v) && v.length <= 20 && v.every(p => p && typeof p === 'object' && typeof p.russian === 'string' && typeof p.german === 'string' && p.russian.length <= 500 && p.german.length <= 3000 && (p.source === 'library' || p.source === 'online'));
export default function PhraseComposer() {
    const { t: _ui, locale } = useLocale();
    const [text, setText] = useState(''), [result, setResult] = useState<TranslationResult | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [copied, setCopied] = useState(false), [practice, setPractice] = useState<Sentence | null>(null);
    const [history, setHistory] = useStoredState<SavedPhrase[]>('klar:phrases:v1', [], validHistory);
    const controllerRef = useRef<AbortController | null>(null), generation = useRef(0);
    const examples = locale === 'uk' ? ['Я вчора грав у футбол із друзями', 'Можна мені тут сісти?', 'Я не можу сьогодні прийти.', 'Ми хочемо вивчати німецьку.'] : phraseExamples;
    const speech = useSpeech();
    const bytes = new TextEncoder().encode(text.trim()).byteLength;
    useEffect(() => () => { generation.current++; controllerRef.current?.abort(); }, []);
    useEffect(() => { generation.current++; controllerRef.current?.abort(); setLoading(false); setResult(null); setPractice(null); setError(''); }, [locale]);
    function edit(value: string) { generation.current++; controllerRef.current?.abort(); setText(value); setResult(null); setError(''); setLoading(false); setPractice(null); setCopied(false); speech.stop(); }
    async function translate(value = text) {
        controllerRef.current?.abort();
        const token = ++generation.current;
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true);
        setError('');
        setResult(null);
        setPractice(null);
        setCopied(false);
        speech.stop();
        try {
            const translated = await translateRussian(value, { signal: controller.signal, sourceLanguage: locale });
            if (token !== generation.current)
                return;
            setResult(translated);
            setHistory(old => [{ russian: translated.russian, german: translated.german, source: translated.source }, ...old.filter(p => p.russian !== translated.russian)].slice(0, 20));
        }
        catch (e) {
            if (token === generation.current && !(e instanceof DOMException && e.name === 'AbortError'))
                setError(e instanceof Error ? e.message : 'Не удалось перевести фразу.');
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    }
    async function copy() { if (!result)
        return; try {
        await navigator.clipboard.writeText(result.german);
        setCopied(true);
    }
    catch {
        setError('Не удалось скопировать автоматически. Выделите немецкий текст и скопируйте его.');
    } }
    function train() { if (!result)
        return; setPractice(result.sentence ?? { id: 'personal-translation', german: result.german, translation: result.russian, hint: 'Восстановите порядок слов из полученного перевода.', explanation: 'Это упражнение на запоминание полученного варианта. Другие переводы и порядки слов тоже могут быть правильными.' }); }
    return <Card className="phrase-composer"><div className="phrase-intro"><Languages size={25}/><div><h2>{_ui("Как сказать по-немецки?")}</h2><p>{_ui("Напишите свою мысль на русском. Получите немецкую фразу и потренируйтесь её собирать.")}</p></div></div><SpeechSettings speech={speech}/><form onSubmit={e => { e.preventDefault(); void translate(); }}><label className="phrase-label" htmlFor="russian-phrase">{_ui("Ваша фраза на русском")}</label><textarea id="russian-phrase" value={text} onChange={e => edit(e.target.value)} placeholder={_ui("Я вчера играл в футбол с друзьями")} rows={4} maxLength={500}/><div className="phrase-submit"><span className={bytes > 500 ? 'over-limit' : 'muted'}>{_ui(bytes)} {_ui(" / 500 байт · короткое предложение")}</span><Button disabled={loading || !text.trim() || bytes > 500} variant="primary">{_ui(loading ? <><LoaderCircle size={16} className="loading-spinner"/> {_ui(" Переводим…")}</> : <>{_ui("Сказать по-немецки ")}<ArrowRight size={17}/></>)}</Button></div></form><p className="translator-notice">{_ui("Совпадения из библиотеки переводятся офлайн. Остальные фразы отправляются в ")}<a href="https://mymemory.translated.net/" target="_blank" rel="noreferrer">MyMemory</a> {_ui(" только по кнопке. У сервиса есть дневной лимит; автоматический перевод может содержать неточности.")}</p><div className="phrase-examples"><span>{_ui("Попробуйте:")}</span>{_ui(examples.map(example => <button key={example} onClick={() => { edit(example); void translate(example); }}>{_ui(example)}</button>))}</div><div aria-live="polite">{_ui(error && <p className="phrase-error" role="alert">{_ui(error)}</p>)}{_ui(result && <section className="phrase-result"><div className="section-heading"><span className="eyebrow">{_ui(result.source === 'library' ? 'ВАРИАНТ ИЗ УЧЕБНОЙ БИБЛИОТЕКИ' : 'АВТОМАТИЧЕСКИЙ ПЕРЕВОД · MYMEMORY')}</span><Badge>{_ui("Русский → Deutsch")}</Badge></div><p className="phrase-original">{_ui(result.russian)}</p><p className="phrase-german" lang="de">{_ui(result.german)}</p><div className="phrase-result-actions"><Button onClick={() => speech.speak(result.german)} variant="secondary"><Volume2 size={17}/> {_ui(" Прослушать")}</Button><Button onClick={copy} variant="secondary">{_ui(copied ? <Check size={16}/> : <Copy size={16}/>)} {_ui(copied ? 'Скопировано' : 'Скопировать')}</Button><Button onClick={train} disabled={result.german.split(/\s+/).length > 45} variant="primary"><Puzzle size={17}/> {_ui(" Собрать из слов")}</Button></div>{_ui(result.explanation && <div className="rule-note"><p>{_ui(result.explanation)}</p></div>)}{_ui(result.source === 'online' && <p className="phrase-machine-note">{_ui("Это один возможный вариант. Для важных текстов проверяйте смысл и формулировку.")}</p>)}</section>)}</div>{_ui(practice && <SentenceQuiz key={`${practice.german}:${result?.russian}`} questions={[practice]} onAnswer={() => { }}/>)}{_ui(!!history.length && <details className="phrase-history"><summary>{_ui("Мои последние фразы · ")}{_ui(history.length)}</summary><p className="muted">{_ui("Хранятся только в этом браузере. Нажмите на фразу, чтобы открыть её снова.")}</p>{_ui(history.map((phrase, i) => <button key={`${phrase.russian}:${i}`} onClick={() => { edit(phrase.russian); setResult(phrase); }}><span>{_ui(phrase.russian)}</span><b lang="de">{_ui(phrase.german)}</b></button>))}</details>)}</Card>;
}
