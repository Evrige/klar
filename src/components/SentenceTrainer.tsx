import Select from './Select';
import {useLocale} from '../i18n/Locale';
import {useState} from 'react';
import {RotateCcw,Search} from 'lucide-react';
import {sentences} from '../data/sentences';
import {sentenceTopics} from '../data/sentenceBank';
import {makeSentenceSession} from '../lib/sentenceSessions';
import {SentenceQuiz} from './SentenceQuiz';
import PhraseComposer from './PhraseComposer';
export {SentenceQuiz} from './SentenceQuiz';
export default function SentenceTrainer({mastered,onAnswer}:{mastered:string[];onAnswer:(id:string,correct:boolean)=>void}){
 const {t: _ui}=useLocale();

 const [mode,setMode]=useState<'practice'|'compose'>('practice'),[topic,setTopic]=useState('Все темы'),[count,setCount]=useState(10),[onlyNew,setOnlyNew]=useState(false),[search,setSearch]=useState('');
 const [questions,setQuestions]=useState(()=>makeSentenceSession(sentences,mastered,10)),[run,setRun]=useState(0);
 const poolFor=(nextTopic=topic,newOnly=onlyNew,query=search)=>sentences.filter(s=>(nextTopic==='Все темы'||s.topic===nextTopic)&&(!newOnly||!mastered.includes(s.id))&&
  (s.translation+' '+s.german).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
 const pool=poolFor();
 function restart(nextTopic=topic,nextCount=count,newOnly=onlyNew,query=search){setQuestions(makeSentenceSession(poolFor(nextTopic,newOnly,query),mastered,nextCount));setRun(r=>r+1);}
 return <><div className="page-intro"><span className="eyebrow">{_ui("ПРАКТИКА · ПОРЯДОК СЛОВ")}</span><h1>{_ui("Слова складываются в речь")}<span>.</span></h1><p>{_ui(sentences.length)} {_ui(" учебных предложений и ваша собственная фраза на русском. Разбирайтесь в порядке слов и сразу применяйте его.")}</p></div><div className="rules-nav sentence-mode-nav"><button className={mode==='practice'?'active':''} aria-pressed={mode==='practice'} onClick={()=>setMode('practice')}>{_ui("Большая библиотека")}</button><button className={mode==='compose'?'active':''} aria-pressed={mode==='compose'} onClick={()=>setMode('compose')}>{_ui("Моя фраза · Русский → Deutsch")}</button></div>{_ui(mode==='compose'?<PhraseComposer/>:<><div className="sentence-filters"><label>{_ui("Тема")}<Select aria-label={_ui("Тема предложений")} value={topic} onChange={e=>{setTopic(e.target.value);restart(e.target.value);}}>{_ui(sentenceTopics.map(t=><option value={t} key={t}>{_ui(t)}</option>))}</Select></label><label>{_ui("Заданий за подход")}<Select aria-label={_ui("Количество предложений")} value={count} onChange={e=>{setCount(Number(e.target.value));restart(topic,Number(e.target.value));}}>{_ui([5,10,20,50].map(n=><option key={n} value={n}>{_ui(n)}</option>))}</Select></label><label className="sentence-unlearned"><input type="checkbox" checked={onlyNew} onChange={e=>{setOnlyNew(e.target.checked);restart(topic,count,e.target.checked);}}/> {_ui(" Только не закреплённые")}</label></div><form className="sentence-search" onSubmit={e=>{e.preventDefault();restart();}}><label className="search"><Search size={16}/><input aria-label={_ui("Поиск предложений")} value={search} onChange={e=>setSearch(e.target.value)} placeholder={_ui("Поиск по русской или немецкой фразе…")}/></label><button className="secondary">{_ui("Найти")}</button></form><div className="trainer-toolbar"><span className="muted">{_ui("Закреплено: ")}{_ui(mastered.length)} / {_ui(sentences.length)} {_ui(" · По фильтру: ")}{_ui(pool.length)}</span><button className="secondary" onClick={()=>restart()} disabled={!pool.length}><RotateCcw size={15}/> {_ui(" Следующие ")}{_ui(Math.min(count,pool.length))} {_ui(" предложений")}</button></div>{_ui(questions.length?<SentenceQuiz key={run} questions={questions} onAnswer={onAnswer}/>:<div className="empty-state"><h2>{_ui("Подходящих предложений пока нет")}</h2><p>{_ui("Измените тему, поиск или отключите фильтр закреплённых.")}</p></div>)}<p className="sentence-library-note">{_ui("В каждой теме — варианты с разными лицами, словами и временем. Новые подходы сначала предлагают не закреплённые предложения. Следуйте подсказке: упражнение проверяет указанную учебную конструкцию.")}</p></>)}</>;
}
