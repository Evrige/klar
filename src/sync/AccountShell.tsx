import {Fragment,useEffect,useRef,useState,type ReactNode} from 'react';
import {AccountContext} from './AccountContext';
import Loading from '../components/Loading';
import {experienceLevel} from '../learning/experience';
import {UserRound,Settings2,TrendingUp,ChevronRight} from 'lucide-react';
import {createPortal} from 'react-dom';
import {Cloud,CloudOff,RefreshCw,LogOut} from 'lucide-react';
import {completeRegistrationImport} from './registrationImport';
import {LocaleProvider,useLocale} from '../i18n/Locale';
import {Button} from '../components/ui';
import {api,sendBatch,startSync,type SyncStatus} from './client';
import {cacheSnapshot,deviceId,outbox,setStorageOwner,storageKey,recoverDirtySnapshot} from './storage';
import './account.css';
import {EmailAuth,type EmailOptions} from './EmailAuth';
import {parseAuthReturn,type AuthReturn} from './authReturn';

type User={id:string;name:string;role:'USER'|'ADMIN'};
type Progress={snapshot:Record<string,unknown>;revisions:unknown};
type Providers=EmailOptions&{github?:boolean;google?:boolean};
function cachedUser():User|null{try{const user=JSON.parse(localStorage.getItem('klar:last-account')??'null');return user&&typeof user.id==='string'&&typeof user.name==='string'?user:null;}catch{return null;}}
export function AccountShell({children}:{children:ReactNode}){
  const [importRetry,setImportRetry]=useState(false);
  const [authReturn]=useState(()=>parseAuthReturn(location.search));
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[generation,setGeneration]=useState(0),[providers,setProviders]=useState<Providers>({}),[status,setStatus]=useState<SyncStatus|null>(null);
  async function load(){
    setReady(false);
    try{
      const me=await api<User>('me');
      try{await completeRegistrationImport(me.id,api);setImportRetry(false);}catch(error){setImportRetry(true);throw error;}setStorageOwner(me.id);recoverDirtySnapshot();
      try{while(outbox().length){if(!await sendBatch())break;}}catch(error){if([401,409].includes((error as {status:number}).status))throw error;setStatus('retry');}
      if(!outbox().length){const progress=await api<Progress>(`progress?deviceId=${deviceId()}`);cacheSnapshot(progress.snapshot);localStorage.setItem(storageKey('revisions:v1'),JSON.stringify(progress.revisions));}
      setUser(me);localStorage.setItem('klar:last-account',JSON.stringify(me));setGeneration(n=>n+1);
    }catch(error){setStorageOwner('guest');setUser(null);throw error;}finally{setReady(true);}
  }
  useEffect(()=>{
    let live=true;
    if(authReturn.open){const url=new URL(location.href);for(const key of ['auth','token','error'])url.searchParams.delete(key);history.replaceState(null,'',url.pathname+url.search+url.hash);}
    void(async()=>{
      if(!navigator.onLine){setStorageOwner('guest');setReady(true);return;}
      try{const p=await api<Providers>('providers');if(!live)return;setProviders(p);if(!authReturn.token&&!localStorage.getItem('klar:account-locked'))await load();}
      catch{if(live){setStorageOwner('guest');setUser(null);setReady(true);}}
      finally{if(live)setReady(true);}
    })();return ()=>{live=false;};
  },[]);
  useEffect(()=>user?startSync(setStatus):undefined,[user]);
  useEffect(()=>{if(!importRetry)return;let running=false;const retry=()=>{if(running||!navigator.onLine||localStorage.getItem('klar:account-locked'))return;running=true;void load().catch(()=>{}).finally(()=>{running=false;});};const timer=setInterval(retry,15000);window.addEventListener('online',retry);return ()=>{clearInterval(timer);window.removeEventListener('online',retry);};},[importRetry]);
  function localLogout(){setImportRetry(false);localStorage.setItem('klar:account-locked','1');setStorageOwner('guest');setUser(null);setStatus(null);setGeneration(n=>n+1);}
  useEffect(()=>{const close=()=>localLogout();window.addEventListener('klar:remote-logout',close);return ()=>window.removeEventListener('klar:remote-logout',close);},[]);
  async function logout(){localLogout();try{await api('auth/sign-out','POST',{});}catch{setStatus('offline');}}
  function offline(){const me=cachedUser();if(!me||localStorage.getItem('klar:account-locked'))return;setStorageOwner(me.id);recoverDirtySnapshot();setUser(me);setStatus('offline');setGeneration(n=>n+1);}
  if(!ready)return <Loading full/>;
  return <Fragment key={`${user?.id??'guest'}:${generation}`}><LocaleProvider><AccountContext.Provider value={{user,rename:name=>{if(!user)return;const updated={...user,name};setUser(updated);localStorage.setItem('klar:last-account',JSON.stringify(updated));}}}>{children}</AccountContext.Provider><AccountPanel user={user} providers={providers} status={status} reload={load} logout={logout} offline={offline} authReturn={authReturn}/></LocaleProvider></Fragment>;
}
function AccountPanel({user,providers,status,reload,logout,offline,authReturn}:{user:User|null;providers:Providers;status:SyncStatus|null;reload:()=>Promise<void>;logout:()=>Promise<void>;offline:()=>void;authReturn:AuthReturn}){
  const {t}=useLocale();
  const [open,setOpen]=useState(authReturn.open),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[target,setTarget]=useState<Element|null>(null);
  const panel=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setTarget(document.querySelector('.header-actions'));},[]);
  useEffect(()=>{if(!open)return;panel.current?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};const outside=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setOpen(false);};window.addEventListener('keydown',key);window.addEventListener('pointerdown',outside);return ()=>{window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',outside);};},[open]);
  async function action(work:()=>Promise<void>){setBusy(true);try{await work();}catch(error){const e=error as {status?:number;message?:string};setMessage(e.message==='ACCOUNT_CHANGED'?t('Аккаунт изменился в другой вкладке. Выйдите и войдите снова.','Акаунт змінився в іншій вкладці. Вийдіть і увійдіть знову.'):e.status===401?t('Войдите снова. Локальная копия сохранена.','Увійдіть знову. Локальну копію збережено.'):e.status===413?t('Данные превышают лимит переноса. Локальный прогресс сохранён.','Дані перевищують ліміт 2 МіБ. Завантажте копію пристрою.'):t('Не удалось выполнить действие. Данные устройства сохранены.','Не вдалося виконати дію. Дані пристрою збережено.'));}finally{setBusy(false);}}
  async function signIn(provider:'github'|'google'){localStorage.removeItem('klar:account-locked');const result=await api<{url?:string}>('auth/sign-in/social','POST',{provider,callbackURL:location.origin});if(result.url)location.assign(result.url);}
  const statusText=status?{
    synced:t('Синхронизировано','Синхронізовано'),conflict:t('Изменения сохранены. Есть различия с сервером.','Зміни збережено. Є відмінності із сервером.'),offline:t('Офлайн. Прогресс сохранён на устройстве.','Офлайн. Прогрес збережено на пристрої.'),retry:t('Соединение недоступно. Отправим изменения повторно.','З’єднання недоступне. Надішлемо зміни повторно.'),reauth:t('Сессия закончилась. Войдите снова; копия сохранена.','Сесія завершилася. Увійдіть знову; копію збережено.'),invalid:t('Не удалось синхронизировать. Прогресс сохранён на устройстве.','Не вдалося синхронізувати. Прогрес збережено на пристрої.'),'account-changed':t('Аккаунт изменён в другой вкладке. Отправка остановлена.','Акаунт змінено в іншій вкладці. Надсилання зупинено.')
  }[status]:'';
  function openPage(page:string){setOpen(false);window.dispatchEvent(new CustomEvent('klar:navigate',{detail:page}));}
  const xp=experienceLevel(Number(localStorage.getItem(storageKey('klar:xp:v1'))) || 0);
  const cached=cachedUser();
  if(!target)return null;
  return createPortal(<div className="account-control"><Button ref={trigger} variant="secondary" aria-expanded={open} aria-controls="account-panel" onClick={()=>setOpen(v=>!v)}>{user?t('Аккаунт','Акаунт'):t('Войти','Увійти')}</Button>{open&&<div id="account-panel" ref={panel} className="account-panel" role="dialog" aria-label={t('Аккаунт Klar','Акаунт Klar')}><div className="account-title"><strong>{user?.name??t('Гостевой режим','Гостьовий режим')}</strong><Button variant="text" onClick={()=>{setOpen(false);trigger.current?.focus();}}>{t('Закрыть','Закрити')}</Button></div>
    {!user?<>{!providers.emailPassword&&!providers.github&&!providers.google&&<p>{t('Сервер входа недоступен. Гостевой режим работает.','Сервер входу недоступний. Гостьовий режим працює.')}</p>}{cached&&!localStorage.getItem('klar:account-locked')&&<Button variant="secondary" onClick={offline}>{t('Открыть офлайн-копию','Відкрити офлайн-копію')}: {cached.name}</Button>}</>:<><div className="account-menu-identity"><span className="profile-avatar">{user.name.trim().slice(0,1).toUpperCase()}</span><div><b>{user.name}</b><small>{t('Личный кабинет','Особистий кабінет')}</small></div></div><div className="account-menu-progress"><span>{t('Учебный уровень','Навчальний рівень')} {xp.level}</span><small>{xp.xp} / {xp.next} XP</small><div className="progress-track"><span style={{width:xp.percent+'%'}}/></div></div><nav className="account-menu-links" aria-label={t('Аккаунт','Акаунт')}>{[{page:'profile',icon:UserRound,ru:'Мой профиль',uk:'Мій профіль'},{page:'settings',icon:Settings2,ru:'Настройки',uk:'Налаштування'},{page:'progress',icon:TrendingUp,ru:'Мой прогресс',uk:'Мій прогрес'}].map(item=><button key={item.page} onClick={()=>openPage(item.page)}><item.icon size={18}/><span>{t(item.ru,item.uk)}</span><ChevronRight size={16}/></button>)}</nav><Button disabled={busy} variant="text" className="account-logout" onClick={()=>void action(logout)}><LogOut size={16} aria-hidden="true"/>{t('Выйти','Вийти')}</Button></>}
    {(!user||status==='reauth'||status==='account-changed'||authReturn.token)&&<EmailAuth options={providers} onAuthenticated={reload} authReturn={authReturn}/>}
    {(!user||status==='reauth'||status==='account-changed')&&<>{providers.github&&<Button disabled={busy} onClick={()=>void action(()=>signIn('github'))}>{t('Войти через GitHub','Увійти через GitHub')}</Button>}<Button className="google-sign-in" variant="secondary" disabled={busy||!providers.google} onClick={()=>void action(()=>signIn('google'))}><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.02 46.98 31.86 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg><span>{t('Войти через Google','Увійти через Google')}</span></Button></>}
    {message&&<p role="status">{message}</p>}
    {user&&statusText&&<p className="account-sync-status" role="status">{status==='synced'?<Cloud size={18} aria-hidden="true"/>:status==='offline'?<CloudOff size={18} aria-hidden="true"/>:<RefreshCw size={18} aria-hidden="true"/>}<span>{statusText}</span></p>}
  </div>}</div>,target);
}
