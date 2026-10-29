import {BookOpen,Lightbulb} from 'lucide-react';
import {Button} from '../components/ui';
import {useLocale} from '../i18n/Locale';
import type {Attempt} from './model';
import {diagnose} from './diagnostics';
import {useRuleNavigation} from './RuleNavigation';
export default function ErrorExplanation({answer,answers,domain,caseSensitive=false}:{answer:string;answers:readonly string[];domain:Attempt['domain'];caseSensitive?:boolean}){
 const {locale,t}=useLocale(),open=useRuleNavigation();const reason=diagnose(answer,answers,domain,caseSensitive);
 return <aside className="error-explanation" aria-label={t('Разбор ответа','Розбір відповіді')}><Lightbulb size={20}/><div><small>{t('Подсказка по сравнению с образцом','Підказка за порівнянням зі зразком')}</small><h4>{reason.title[locale]}</h4><p>{reason.detail[locale]}</p>{reason.pattern&&<p className="error-pattern" lang="de">{reason.pattern}</p>}{reason.rule&&open&&<Button variant="text" type="button" onClick={()=>open(reason.rule!)}><BookOpen size={16}/>{t('Открыть правило','Відкрити правило')}</Button>}</div></aside>;
}
