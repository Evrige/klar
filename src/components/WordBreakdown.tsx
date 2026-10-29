import {Languages} from 'lucide-react';
import {sentenceGlosses} from '../data/sentenceGlossary';
import {useLocale} from '../i18n/Locale';
import {useEffect,useRef,useState} from 'react';
import {Button} from './ui';
import {translateGloss} from '../lib/translateGloss';
export default function WordBreakdown({german,allowOnline=false}:{german:string;allowOnline?:boolean}){
 const {locale,t}=useLocale();const words=sentenceGlosses(german,locale);
 const [online,setOnline]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const controller=useRef<AbortController|null>(null),generation=useRef(0);
 useEffect(()=>{generation.current++;controller.current?.abort();setOnline({});setBusy(false);setError(false);return ()=>{generation.current++;controller.current?.abort();};},[german,locale]);
 const key=(word:string)=>word.toLocaleLowerCase('de-DE');
 const missing=[...new Set(words.filter(word=>!word.known&&!online[key(word.word)]).map(word=>key(word.word)))].slice(0,45);
 async function load(){
  if(busy)return;const token=++generation.current,c=new AbortController();controller.current=c;setBusy(true);setError(false);
  const timer=setTimeout(()=>c.abort(),30000);
  let index=0;
  try{await Promise.all(Array.from({length:Math.min(2,missing.length)},async()=>{while(index<missing.length&&!c.signal.aborted){const word=missing[index++];try{const translation=await translateGloss(word,locale,c.signal);if(token===generation.current)setOnline(old=>({...old,[word]:translation}));}catch{if(token===generation.current)setError(true);c.abort();}}}));}
  finally{clearTimeout(timer);if(token===generation.current)setBusy(false);}
 }
 return <section className="word-breakdown"><h3><Languages size={18}/>{t('Что значит каждое слово','Що означає кожне слово')}</h3><p>{t('Разбор правильного предложения. Значения показаны для понимания конструкции: дословный перевод не всегда совпадает с естественной русской фразой.','Розбір правильного речення. Значення показано для розуміння конструкції: дослівний переклад не завжди збігається з природною українською фразою.')}</p><div className="gloss-grid">{words.map((word,i)=><div className={(word.known||online[key(word.word)])?'gloss-item':'gloss-item missing-gloss'} key={`${i}:${word.word}`}><b lang="de">{word.word}</b><span>{online[key(word.word)]??word.translation}</span>{online[key(word.word)]&&<small>{t('Автоматический перевод','Автоматичний переклад')}</small>}{word.note&&<small>{word.note}</small>}</div>)}</div>{allowOnline&&missing.length>0&&<div className="gloss-online"><Button variant="secondary" disabled={busy} onClick={()=>void load()}>{busy?t('Переводим слова…','Перекладаємо слова…'):t('Перевести остальные слова','Перекласти решту слів')}</Button><p className="muted">{t('Эти слова отправятся в MyMemory. Перевод отдельных слов может отличаться от значения в предложении.','Ці слова буде надіслано в MyMemory. Переклад окремих слів може відрізнятися від значення в реченні.')}</p></div>}{error&&<p role="status">{t('Не удалось перевести все слова. Попробуйте позже.','Не вдалося перекласти всі слова. Спробуйте пізніше.')}</p>}</section>;
}
