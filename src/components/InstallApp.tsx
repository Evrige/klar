import {useLocale} from '../i18n/Locale';
import {useEffect,useState} from 'react';
import {Download,Smartphone,X} from 'lucide-react';
import {usePwaUpdates} from '../hooks/usePwaUpdates';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallApp(){
 const {t: _ui}=useLocale();

 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false),[installing,setInstalling]=useState(false),[message,setMessage]=useState('');
 const {needRefresh,setNeedRefresh,offlineReady,setOfflineReady,updateServiceWorker}=usePwaUpdates();
 useEffect(()=>{
  setInstalled(window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
  const available=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt);};
  const complete=()=>{setInstalled(true);setPrompt(null);};
  window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',complete);
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',complete);};
 },[]);
 async function install(){
  if(installing)return;
  if(!prompt){setMessage('Браузер не предоставил окно установки. Используйте его меню по инструкции ниже. Во встроенном браузере мессенджера откройте ссылку отдельно в Chrome или Safari.');return;}
  const pending=prompt;setPrompt(null);setInstalling(true);setMessage('Открываем окно установки браузера…');
  try{
   await pending.prompt();const choice=await pending.userChoice;
   setMessage(choice.outcome==='accepted'?'Запрос принят браузером. Дождитесь завершения и проверьте список приложений или главный экран.':'Установка отменена. Можно повторить её через меню браузера.');
  }catch{
   setMessage('Браузер не смог открыть установку. Откройте опубликованную HTTPS-ссылку напрямую в Chrome на Android или Safari на iPhone и используйте меню браузера.');
  }finally{setInstalling(false);}
 }
 return <>{_ui(!installed&&<details className="install-help"><summary><Smartphone size={19}/><span>{_ui("Установить Klar на телефон")}</span></summary><div><p><b>Android:</b> {_ui(" откройте опубликованную ссылку в Chrome → меню ⋮ → «Установить приложение» или «Добавить на главный экран».")}</p><p><b>iPhone:</b> {_ui(" откройте ссылку в Safari → «Поделиться» → «На экран “Домой”» → «Открывать как веб-приложение» → «Добавить».")}</p><p>{_ui("Один раз загрузите приложение онлайн. Когда появится сообщение о готовности офлайн, словарь и тренажёры будут доступны без сети. Озвучка остальных слов зависит от установленного немецкого голоса.")}</p><button className="primary" onClick={install} disabled={installing}><Download size={16}/> {_ui(installing?'Ожидаем браузер…':prompt?'Установить приложение':'Как установить')}</button><p className="install-status" role="status">{_ui(message)}</p><p><b>{_ui("Если ничего не происходит:")}</b> {_ui(" откройте ссылку в обычной вкладке Chrome или Safari, а не внутри Telegram, Instagram или ChatGPT. После «Создать ярлык» проверьте главный экран и список приложений — название будет Klar.")}</p></div></details>)}{_ui((needRefresh||offlineReady)&&<div className="pwa-message" role="status"><p>{_ui(needRefresh?'Доступно обновление Klar. Примените его, когда закончите упражнение.':'Klar готов к работе офлайн. Прогресс хранится на этом устройстве.')}</p>{_ui(needRefresh&&<button className="primary" onClick={()=>updateServiceWorker()}>{_ui("Обновить")}</button>)}<button className="icon-button" aria-label={_ui("Закрыть уведомление")} onClick={()=>{setNeedRefresh(false);setOfflineReady(false);}}><X size={18}/></button></div>)}</>;
}
