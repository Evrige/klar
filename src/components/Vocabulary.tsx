import {TextInput} from './ui';
import { Badge, Button, PageIntro, ProgressBar } from './ui';
import Select from './Select';
import { useLocale } from '../i18n/Locale';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, Grid2X2, Layers, List, RotateCcw, Search, Volume2, X } from 'lucide-react';
import { categories, vocabulary, type VocabularyProgress, type Word, type WordStatus } from '../data/vocabulary';
import { advanceWordSession, makeWordSession, shuffle, WORD_SESSION_SIZE, type WordSession } from '../data/vocabularyPractice';
import { useSpeech } from '../hooks/useSpeech';
import { nouns } from '../data/nouns';
import SpeechSettings from './SpeechSettings';
import { wordLevels, wordLevel, validSelectedLevels, levelSources, type WordLevel } from '../data/wordLevels';
import { useStoredState } from '../hooks/useStoredState';
type Filter = 'all' | 'new' | 'learning' | 'known';
const labels: Record<Filter, string> = { all: 'Все слова', new: 'Новые', learning: 'Изучаю', known: 'Знаю' };
const PAGE_SIZE = 20;
const partOfSpeech: Record<string, [string, string]> = {
    noun: ['Существительное', 'Іменник'],
    verb: ['Глагол', 'Дієслово'],
    adj: ['Прилагательное', 'Прикметник'],
    adv: ['Наречие', 'Прислівник'],
    conj: ['Союз', 'Сполучник'],
    prep: ['Предлог', 'Прийменник'],
    pron: ['Местоимение', 'Займенник'],
    particle: ['Частица', 'Частка'],
    intj: ['Междометие', 'Вигук'],
    num: ['Числительное', 'Числівник'],
    article: ['Артикль', 'Артикль'],
    phrase: ['Выражение', 'Вираз'],
};
export default function Vocabulary({ progress, onMark }: {
    progress: VocabularyProgress;
    onMark: (id: string, status: WordStatus) => void;
}) {
    const { t: _ui } = useLocale();
    const [selectedLevels, setSelectedLevels] = useStoredState<WordLevel[]>('klar:vocabulary:levels:v1', [...wordLevels], validSelectedLevels);
    const [filter, setFilter] = useState<Filter>('all'), [category, setCategory] = useState('Все темы'), [search, setSearch] = useState('');
    const [mode, setMode] = useState<'cards' | 'list'>('cards'), [focused, setFocused] = useState(''), [revealed, setRevealed] = useState<string[]>([]), [listPage, setListPage] = useState(0);
    const [session, setSession] = useState<WordSession | null>(null);
    const completed = session ? session.total - session.pending.length - session.retries.length : 0;
    const speech = useSpeech();
    const { speak } = speech;
    const [wordOrder] = useState(() => shuffle(vocabulary));
    const levelWords = vocabulary.filter(w => selectedLevels.includes(wordLevel(w.id)));
    const levelCounts = Object.fromEntries(wordLevels.map(l => [l, vocabulary.filter(w => wordLevel(w.id) === l).length]));
    const counts = { all: levelWords.length, new: levelWords.filter(w => !progress[w.id]).length, learning: levelWords.filter(w => progress[w.id] === 'learning').length, known: levelWords.filter(w => progress[w.id] === 'known').length };
    const query = search.trim().toLocaleLowerCase('de');
    const filtered = wordOrder.filter(w => selectedLevels.includes(wordLevel(w.id)) && (category === 'Все темы' || w.category === category) && (filter === 'all' || (filter === 'new' ? !progress[w.id] : progress[w.id] === filter)) && `${w.word} ${w.translation}`.toLocaleLowerCase('de').includes(query));
    const active = session ? session.pending[0] : filtered.find(w => w.id === focused) ?? filtered[0];
    const activeNoun = active ? nouns.find(n => `${n.article} ${n.singular}` === active.word) : undefined;
    const plural = active?.plural ?? activeNoun?.plural;
    const position = active ? filtered.findIndex(w => w.id === active.id) : 0;
    const page = Math.min(listPage, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
    function resetView() { setRevealed([]); setListPage(0); }
    function toggleLevel(level: WordLevel) { setSelectedLevels(old => old.length === wordLevels.length ? [level] : old.includes(level) ? old.filter(l => l !== level) : [...old, level]); resetView(); }
    function move(offset: number) {
        if (!filtered.length)
            return;
        setFocused(filtered[(position + offset + filtered.length) % filtered.length].id);
        setRevealed([]);
    }
    function startSession() {
        const pending = makeWordSession(filtered);
        if (!pending.length) return;
        setRevealed([]);
        setSession({ pending, retries: [], total: pending.length });
    }
    function closeSession() {
        setSession(null);
        resetView();
    }
    function mark(word: Word, status: WordStatus) {
        setRevealed([]);
        if (session) {
            if (session.pending[0]?.id !== word.id) return;
            setSession(advanceWordSession(session, status));
        } else if (active?.id === word.id) {
            setFocused(filtered[(position + 1) % filtered.length]?.id ?? word.id);
        }
        onMark(word.id, status);
    }
    function reveal(id: string) { setRevealed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
    const summary = <div className="vocab-stats">{_ui((['all', 'new', 'learning', 'known'] as Filter[]).map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? 'selected' : ''} onClick={() => { setFilter(f); resetView(); }}><span>{_ui(labels[f])}</span><strong>{_ui(counts[f])}</strong></button>))}</div>;
    const studyCard = active && (
        <article className="word-card" key={active.id}><div className="word-card-top"><Badge>{_ui(active.category)} · {wordLevel(active.id) === 'extra' ? _ui('Дополнительно', 'Додатково') : wordLevel(active.id)}</Badge><span className={`word-status ${progress[active.id] ?? 'new'}`}>{_ui(progress[active.id] === 'known' ? 'Знаю' : progress[active.id] === 'learning' ? 'Изучаю' : 'Новое слово')}</span></div>{!session && <span className="word-counter">{_ui("КАРТОЧКА ")}{_ui(position + 1)} {_ui(" ИЗ ")}{_ui(filtered.length)}</span>}<h2 lang="de">{_ui(active.word)}</h2>{plural && <p className="vocab-plural" lang="de"><span>{_ui('Множественное число', 'Множина')}</span>die {plural}<Button aria-label={_ui('Прослушать обе формы', 'Прослухати обидві форми')} onClick={() => speak(`${active.word}. Die ${plural}.`)} variant="icon"><Volume2 size={16}/></Button></p>}<div className="reading">[{_ui(active.reading)}]<span>{_ui("приблизительное чтение")}</span></div><Button onClick={() => speak(active.word)} variant="speech"><Volume2 size={19}/> {_ui(" Прослушать слово")}</Button><button className={`translation-toggle ${revealed.includes(active.id) ? 'revealed' : ''}`} aria-expanded={revealed.includes(active.id)} onClick={() => reveal(active.id)}>{_ui(revealed.includes(active.id) ? <span>{_ui(active.translation)}<small>{_ui("Нажмите, чтобы скрыть")}</small></span> : <><Eye size={19}/><span>{_ui("Показать перевод")}<small>{_ui("Сначала попробуйте вспомнить")}</small></span></>)}</button>
    {revealed.includes(active.id) && (active.pos || active.example) && <div className="vocab-word-details">
        {active.pos && partOfSpeech[active.pos] && <small>{_ui(...partOfSpeech[active.pos])}</small>}
        {active.past && <p lang="de"><strong>Präteritum</strong> {active.past}</p>}
        {active.perfect && <p lang="de"><strong>Perfekt</strong> {active.perfect}</p>}
        {!active.perfect && active.participle && <p lang="de"><strong>Partizip II</strong> {active.participle}</p>}
        {active.separable && <small>{_ui('Отделяемая приставка', 'Відокремлюваний префікс')}</small>}
        {active.example && <div className="vocab-word-example">
            <p lang="de">{active.example}</p>
            <p>{active.exampleTranslation}</p>
            {active.exampleIds && <small><a href={`https://tatoeba.org/sentences/show/${active.exampleIds[0]}`} target="_blank" rel="noreferrer">Tatoeba</a> · <a href={`https://tatoeba.org/sentences/show/${active.exampleIds[1]}`} target="_blank" rel="noreferrer">{_ui('Источник перевода', 'Джерело перекладу')}</a></small>}
        </div>}
    </div>}
    <div className="word-decisions"><button className="learning-button" onClick={() => mark(active, 'learning')}><Layers size={18}/> {_ui(" Не знаю · учить")}</button><Button onClick={() => mark(active, 'known')} variant="primary"><Check size={18}/> {_ui(" Знаю")}</Button></div></article>
    );
    return <><PageIntro><span className="eyebrow">{_ui("СЛОВАРНЫЙ ЗАПАС · ")}{_ui(vocabulary.length)} {_ui(" КАРТОЧЕК")}</span><h1>{_ui("Слова, которые пригодятся")}<span>.</span></h1><p>{_ui("Вспомните перевод, откройте ответ и решите: уже знаете слово или будете учить.")}</p></PageIntro>
 <SpeechSettings speech={speech}/>{!session && <section className="vocabulary-level-filter"><div className="section-heading"><div><h2>{_ui('Какие слова учим?', 'Які слова вивчаємо?')}</h2><p>{_ui('Выберите один или несколько уровней. Практика использует эту же выборку.', 'Виберіть один або кілька рівнів. Практика використовує цю саму вибірку.')}</p></div></div><div className="word-level-chips"><button className={selectedLevels.length === wordLevels.length ? 'selected' : ''} aria-pressed={selectedLevels.length === wordLevels.length} onClick={() => { setSelectedLevels([...wordLevels]); resetView(); }}>{_ui('Все уровни', 'Усі рівні')}<small>{vocabulary.length}</small></button>{wordLevels.map(l => <button key={l} className={selectedLevels.includes(l) ? 'selected' : ''} aria-pressed={selectedLevels.includes(l)} onClick={() => toggleLevel(l)}>{l === 'extra' ? _ui('Дополнительно', 'Додатково') : l}<small>{levelCounts[l]}</small></button>)}</div><p className="course-caption">{_ui('Уровни ориентировочные. Учитываются списки Goethe и частотность. «Дополнительно» — карточки без установленного уровня.', 'Рівні орієнтовні. Враховано списки Goethe та частотність. «Додатково» — картки без установленого рівня.')} {levelSources.map(source => <a key={source.level} href={source.url} target="_blank" rel="noreferrer">{source.level}</a>)}</p>
 <details className="course-caption">
    <summary>{_ui('Источники новых карточек', 'Джерела нових карток')}</summary>
    <ul>
        <li><a href="https://ru.wiktionary.org/" target="_blank" rel="noreferrer">{_ui('Викисловарь', 'Вікісловник')}</a> / <a href="https://kaikki.org/ruwiktionary/" target="_blank" rel="noreferrer">Kaikki / Wiktextract</a> · CC BY-SA</li>
        <li><a href="https://github.com/viorelsfetea/german-verbs-database" target="_blank" rel="noreferrer">{_ui('Формы глаголов из Викисловаря', 'Форми дієслів із Вікісловника')}</a></li>
        <li><a href="https://github.com/rspeer/wordfreq" target="_blank" rel="noreferrer">wordfreq</a> · {_ui('частотность', 'частотність')}</li>
        <li><a href="https://tatoeba.org/en/downloads" target="_blank" rel="noreferrer">Tatoeba</a> · CC BY 2.0 FR</li>
    </ul>
 </details>{!selectedLevels.length && <p role="status">{_ui('Выберите хотя бы один уровень.', 'Виберіть хоча б один рівень.')}</p>}</section>}
 {_ui(session ? <section className="word-session">
    {active ? <>
        <header className="word-session-header">
            <div className="word-session-heading">
                <h2>{_ui('Практика слов', 'Практика слів')}</h2>
                <Button onClick={closeSession} variant="secondary"><X size={16}/> {_ui('Выйти', 'Вийти')}</Button>
            </div>
            <p className="word-session-progress" aria-live="polite">
                <span>{_ui('Отмечено «Знаю»', 'Позначено «Знаю»')}</span>
                <strong>{completed} / {session.total}</strong>
            </p>
            <ProgressBar className="progress-track" fillStyle={{ width: `${completed / session.total * 100}%` }}/>
        </header>
        {studyCard}
    </> : <div className="session-result" role="status">
        <Check size={38}/>
        <h2>{_ui('Практика завершена', 'Практику завершено')}</h2>
        <p>{_ui('Все слова из подхода в списке «Знаю».', 'Усі слова з підходу в списку «Знаю».')}</p>
        <Button onClick={closeSession} variant="primary">{_ui('К словарю', 'До словника')}<ArrowRight size={17}/></Button>
    </div>}
 </section> : <>
 {_ui(summary)}<div className="vocab-toolbar"><label className="search"><Search size={17}/><TextInput aria-label={_ui("Поиск слова или перевода")} value={search} onChange={e => { setSearch(e.target.value); resetView(); }} placeholder={_ui("Слово или перевод…")}/></label><Select aria-label={_ui("Тема словаря")} value={category} onChange={e => { setCategory(e.target.value); resetView(); }}><option value={"Все темы"}>{_ui("Все темы")}</option>{_ui(categories.map(c => <option value={c} key={c}>{_ui(c)}</option>))}</Select><div className="view-toggle"><button aria-label={_ui("Режим карточек")} aria-pressed={mode === 'cards'} onClick={() => setMode('cards')}><Grid2X2 size={18}/></button><button aria-label={_ui("Режим списка")} aria-pressed={mode === 'list'} onClick={() => setMode('list')}><List size={18}/></button></div></div><div className="section-heading vocab-section-heading"><span className="muted">{_ui(labels[filter])} {_ui(" · Найдено: ")}{_ui(filtered.length)}</span><Button onClick={startSession} disabled={!filtered.length} variant="secondary"><RotateCcw size={15}/>{_ui(filter === 'known' ? 'Повторение изученного' : filter === 'learning' ? 'Практика изучаемых' : 'Практика')}  · {Math.min(filtered.length, WORD_SESSION_SIZE)} {_ui("слов", "слів")}</Button></div>
 {_ui(!active ? <div className="empty-state"><BookOpen size={35}/><h2>{_ui(filter === 'known' ? 'Здесь будут знакомые слова' : filter === 'learning' ? 'Пока нет изучаемых слов' : 'Ничего не найдено')}</h2><p>{_ui(filter === 'known' ? 'Нажмите «Знаю» на карточке — слово появится здесь.' : filter === 'learning' ? 'Нажмите «Не знаю» — слово попадёт сюда для повторения.' : 'Измените запрос или выберите другую тему.')}</p><Button onClick={() => { setFilter('all'); setCategory('Все темы'); setSearch(''); resetView(); }} variant="secondary">{_ui("Открыть все слова")}</Button></div> : mode === 'cards' ? <>{studyCard}<div className="card-pagination"><Button onClick={() => move(-1)} disabled={filtered.length < 2} variant="secondary"><ArrowLeft size={16}/> {_ui(" Назад")}</Button><span>{_ui("Отметка сохранится, затем откроется следующая карточка.")}</span><Button onClick={() => move(1)} disabled={filtered.length < 2} variant="secondary">{_ui("Пропустить ")}<ArrowRight size={16}/></Button></div></> : <><div className="word-list">{_ui(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(w => <article className="word-list-row" key={w.id}><div className="word-list-main"><h3 lang="de">{_ui(w.word)}</h3><span className="muted">[{_ui(w.reading)}]</span><small>{_ui(w.category)} · {wordLevel(w.id) === 'extra' ? _ui('Дополнительно', 'Додатково') : wordLevel(w.id)} · {_ui(progress[w.id] === 'known' ? 'Знаю' : progress[w.id] === 'learning' ? 'Изучаю' : 'Новое')}</small></div><Button aria-label={_ui(`Озвучить ${w.word}`)} onClick={() => speak(w.word)} variant="icon"><Volume2 size={18}/></Button><button className="list-translation" aria-label={_ui(`Перевод ${w.word}`)} aria-expanded={revealed.includes(w.id)} onClick={() => reveal(w.id)}>{_ui(revealed.includes(w.id) ? w.translation : <><Eye size={15}/> {_ui(" Перевод")}</>)}</button><div className="list-decisions"><button aria-label={_ui(`Не знаю: ${w.word}`)} title={_ui("В изучаемые")} className={progress[w.id] === 'learning' ? 'marked-learning' : ''} onClick={() => onMark(w.id, 'learning')}><Layers size={17}/></button><button aria-label={_ui(`Знаю: ${w.word}`)} title={_ui("В изученные")} className={progress[w.id] === 'known' ? 'marked-known' : ''} onClick={() => onMark(w.id, 'known')}><Check size={17}/></button></div></article>))}</div><div className="card-pagination"><Button onClick={() => { setListPage(page - 1); setRevealed([]); }} disabled={page === 0} variant="secondary"><ArrowLeft size={16}/> {_ui(" Назад")}</Button><span>{_ui("Страница ")}{_ui(page + 1)} / {_ui(Math.ceil(filtered.length / PAGE_SIZE))}</span><Button onClick={() => { setListPage(page + 1); setRevealed([]); }} disabled={(page + 1) * PAGE_SIZE >= filtered.length} variant="secondary">{_ui("Далее ")}<ArrowRight size={16}/></Button></div></>)}
 <div className="vocabulary-help"><LightbulbText /><p>{_ui("«Знаю» и «Изучаю» — ваши личные списки. Статус можно поменять в любой момент. Практика использует текущий список, тему и поиск. Новые слова автоматически в списки не добавляются.")}</p></div></>)}
 <p className="vocabulary-disclaimer">{_ui("Подборка из ")}{_ui(vocabulary.length)} {_ui(" базовых слов и устойчивых выражений для повседневного общения. Это тематический стартовый словарь, а не частотный рейтинг. Кириллица приблизительно передаёт звучание и не отражает все немецкие звуки; ориентируйтесь на немецкую озвучку. Для неё нужен немецкий голос на устройстве. Прогресс хранится в этом браузере.")}</p></>;
}
function LightbulbText() {
    const { t: _ui } = useLocale();
    return <span aria-hidden="true" className="vocabulary-help-icon">i</span>;
}
