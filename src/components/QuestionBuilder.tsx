import {useState} from 'react';
import {ArrowDown,ArrowRight} from 'lucide-react';
const examples=[
 {id:'learn',label:'Обычный глагол',statement:'Du lernst heute Deutsch.',ru:'Ты сегодня учишь немецкий.',yes:['Lernst','du','heute Deutsch'],yesRu:'Ты сегодня учишь немецкий?',wh:['Was','lernst','du','heute'],whRu:'Что ты сегодня учишь?'},
 {id:'go',label:'Направление',statement:'Du fährst morgen nach Berlin.',ru:'Ты завтра едешь в Берлин.',yes:['Fährst','du','morgen nach Berlin'],yesRu:'Ты завтра едешь в Берлин?',wh:['Wohin','fährst','du','morgen'],whRu:'Куда ты завтра едешь?'},
 {id:'modal',label:'Модальный глагол',statement:'Du kannst morgen kommen.',ru:'Ты можешь завтра прийти.',yes:['Kannst','du','morgen','kommen'],yesRu:'Ты можешь завтра прийти?',wh:['Wann','kannst','du','kommen'],whRu:'Когда ты можешь прийти?'},
 {id:'past',label:'Прошедшее время',statement:'Du hast gestern Fußball gespielt.',ru:'Ты вчера играл в футбол.',yes:['Hast','du','gestern Fußball','gespielt'],yesRu:'Ты вчера играл в футбол?',wh:['Was','hast','du','gestern','gespielt'],whRu:'Во что ты вчера играл?'},
 {id:'prefix',label:'Отделяемая приставка',statement:'Du stehst um sieben Uhr auf.',ru:'Ты встаёшь в семь часов.',yes:['Stehst','du','um sieben Uhr','auf'],yesRu:'Ты встаёшь в семь часов?',wh:['Wann','stehst','du','auf'],whRu:'Когда ты встаёшь?'}
];
export default function QuestionBuilder(){
 const [example,setExample]=useState('learn'),[mode,setMode]=useState<'yes'|'wh'>('yes');
 const current=examples.find(e=>e.id===example)!;const words=current[mode];
 return <div className="question-builder rule-builder"><span className="eyebrow">ПРЕВРАТИТЕ УТВЕРЖДЕНИЕ В ВОПРОС</span><div className="builder-controls"><label>Конструкция<select value={example} onChange={e=>setExample(e.target.value)}>{examples.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}</select></label><label>Тип вопроса<select value={mode} onChange={e=>setMode(e.target.value as 'yes'|'wh')}><option value="yes">Ответ да / нет</option><option value="wh">С вопросительным словом</option></select></label></div><div className="question-statement"><b lang="de">{current.statement}</b><ArrowRight size={18}/><span>{current.ru}</span></div><ArrowDown className="question-down" size={22}/><div className="question-output"><p lang="de">{words.map((word,i)=><span key={i} className={i===(mode==='yes'?0:1)?'question-verb':mode==='wh'&&i===0?'question-w':''}>{word}{i<words.length-1?' ':''}</span>)}?</p><ArrowRight size={21}/><strong>{mode==='yes'?current.yesRu:current.whRu}</strong></div><p>Выделенный зелёным — спрягаемый глагол. {mode==='yes'?'Ставим его в начало, затем подлежащее.':'Сначала вопросительное слово, затем глагол и подлежащее.'} Остальная часть глагольной рамки остаётся в конце.</p></div>;
}
