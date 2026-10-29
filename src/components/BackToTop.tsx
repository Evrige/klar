import {useEffect,useState} from 'react';
import {ArrowUp} from 'lucide-react';
import {useLocale} from '../i18n/Locale';
export default function BackToTop(){
 const [visible,setVisible]=useState(false);const {t}=useLocale();
 useEffect(()=>{const update=()=>setVisible(window.scrollY>400);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
 if(!visible)return null;
 return <button type="button" className="back-to-top" title={t('Наверх','Нагору')} aria-label={t('Прокрутить страницу наверх','Прокрутити сторінку нагору')} onClick={()=>{window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}><ArrowUp size={21}/><span>{t('Наверх','Нагору')}</span></button>;
}
