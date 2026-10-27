import {useEffect,useState} from 'react';
import {Download,Smartphone,X} from 'lucide-react';
import {usePwaUpdates} from '../hooks/usePwaUpdates';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallApp(){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false);
 const {needRefresh,setNeedRefresh,offlineReady,setOfflineReady,updateServiceWorker}=usePwaUpdates();
 useEffect(()=>{
  setInstalled(window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
  const available=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt);};
  const complete=()=>{setInstalled(true);setPrompt(null);};
  window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',complete);
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',complete);};
 },[]);
 async function install(){if(!prompt)return;await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')setInstalled(true);setPrompt(null);}
 return <>{!installed&&<details className="install-help"><summary><Smartphone size={19}/><span>Установить Klar на телефон</span></summary><div><p><b>Android:</b> откройте опубликованную ссылку в Chrome → меню ⋮ → «Установить приложение» или «Добавить на главный экран».</p><p><b>iPhone:</b> откройте ссылку в Safari → «Поделиться» → «На экран “Домой”» → «Открывать как веб-приложение» → «Добавить».</p><p>Один раз загрузите приложение онлайн. Когда появится сообщение о готовности офлайн, словарь и тренажёры будут доступны без сети. Озвучка остальных слов зависит от установленного немецкого голоса.</p>{prompt&&<button className="primary" onClick={install}><Download size={16}/> Установить</button>}</div></details>}{(needRefresh||offlineReady)&&<div className="pwa-message" role="status"><p>{needRefresh?'Доступно обновление Klar. Примените его, когда закончите упражнение.':'Klar готов к работе офлайн. Прогресс хранится на этом устройстве.'}</p>{needRefresh&&<button className="primary" onClick={()=>updateServiceWorker()}>Обновить</button>}<button className="icon-button" aria-label="Закрыть уведомление" onClick={()=>{setNeedRefresh(false);setOfflineReady(false);}}><X size={18}/></button></div>}</>;
}
