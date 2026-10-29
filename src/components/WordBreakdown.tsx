import {Languages} from 'lucide-react';
import {sentenceGlosses} from '../data/sentenceGlossary';
import {useLocale} from '../i18n/Locale';
export default function WordBreakdown({german}:{german:string}){
 const {locale,t}=useLocale();const words=sentenceGlosses(german,locale);
 return <section className="word-breakdown"><h3><Languages size={18}/>{t('Что значит каждое слово','Що означає кожне слово')}</h3><p>{t('Разбор правильного предложения. Значения показаны для понимания конструкции: дословный перевод не всегда совпадает с естественной русской фразой.','Розбір правильного речення. Значення показано для розуміння конструкції: дослівний переклад не завжди збігається з природною українською фразою.')}</p><div className="gloss-grid">{words.map((word,i)=><div className={word.known?'gloss-item':'gloss-item missing-gloss'} key={`${i}:${word.word}`}><b lang="de">{word.word}</b><span>{word.translation}</span>{word.note&&<small>{word.note}</small>}</div>)}</div></section>;
}
