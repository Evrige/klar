import {useState,type FormEvent} from 'react';
import {Button} from '../components/ui';
import {useLocale} from '../i18n/Locale';
import {api} from './client';
import {prepareRegistrationImport} from './registrationImport';
import type {AuthReturn} from './authReturn';
export type EmailOptions={emailPassword?:boolean;emailDelivery?:boolean};
export function EmailAuth({options,onAuthenticated,authReturn}:{options:EmailOptions;onAuthenticated:()=>Promise<void>;authReturn:AuthReturn}){
    const {t}=useLocale();
    const [mode,setMode]=useState<'login'|'register'|'forgot'|'reset'>(authReturn.token?'reset':'login');
    const [email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false);
    const [message,setMessage]=useState(authReturn.notice==='invalid'?t('Ссылка недействительна или истекла. Запросите новую.','Посилання недійсне або строк дії минув. Запитайте нове.'):authReturn.notice==='password-changed'?t('Пароль изменён. Войдите с новым паролем.','Пароль змінено. Увійдіть із новим паролем.'):'');
    function change(next:typeof mode){setMode(next);setPassword('');setRepeat('');setMessage('');}
    async function submit(event:FormEvent){
        event.preventDefault();if(busy)return;
        if((mode==='register'||mode==='reset')&&password!==repeat){setMessage(t('Пароли не совпадают.','Паролі не збігаються.'));return;}
        setBusy(true);setMessage('');
        try{
            if(mode==='forgot'){
                await api('auth/request-password-reset','POST',{email:email.trim(),redirectTo:`${location.origin}/?auth=reset-password`});
                setMessage(t('Если для этого адреса есть аккаунт, мы отправим ссылку для восстановления.','Якщо для цієї адреси є акаунт, ми надішлемо посилання для відновлення.'));return;
            }
            if(mode==='reset'){
                await api('auth/reset-password','POST',{token:authReturn.token,newPassword:password});
                localStorage.setItem('klar:account-locked','1');location.replace(`${location.origin}/?auth=password-changed`);return;
            }
            const result=await api<{token?:string|null;user?:{id:string}}>('auth/'+(mode==='register'?'sign-up/email':'sign-in/email'),'POST',{
                email:email.trim(),password,...(mode==='register'?{name:name.trim()}:{}),callbackURL:location.origin,
            });
            if(mode==='register'&&result.user?.id)prepareRegistrationImport(result.user.id);
            localStorage.removeItem('klar:account-locked');await onAuthenticated();
        }catch(error){
            const e=error as {status?:number;code?:string};
            if(e.code==='AUTH_MAIL_NOT_CONFIGURED')setMessage(t('Отправка писем пока не настроена.','Надсилання листів ще не налаштовано.'));
            else if(e.status===429)setMessage(t('Слишком много попыток. Подождите и повторите.','Забагато спроб. Зачекайте й повторіть.'));
            else if(['INVALID_ORIGIN','INVALID_CALLBACK_URL','INVALID_REDIRECT_URL'].includes(e.code??''))setMessage(t('Адрес страницы не разрешён сервером. Откройте сайт по его основному адресу и обновите страницу.','Адресу сторінки не дозволено сервером. Відкрийте сайт за його основною адресою й оновіть сторінку.'));
            else if(['USER_ALREADY_EXISTS','USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'].includes(e.code??''))setMessage(t('Этот email уже зарегистрирован. Перейдите во вкладку «Вход».','Цей email уже зареєстровано. Перейдіть на вкладку «Вхід».'));
            else if(['PASSWORD_TOO_SHORT','PASSWORD_TOO_LONG'].includes(e.code??''))setMessage(t('Пароль должен содержать от 12 до 128 символов.','Пароль має містити від 12 до 128 символів.'));
            else if(e.status&&e.status>=500)setMessage(t('Сервер временно недоступен. Попробуйте позже.','Сервер тимчасово недоступний. Спробуйте пізніше.'));
            else if(mode==='login')setMessage(t('Не удалось войти. Проверьте email, пароль и соединение.','Не вдалося увійти. Перевірте email, пароль і з’єднання.'));
            else if(mode==='reset')setMessage(t('Не удалось изменить пароль. Ссылка могла истечь или уже использована.','Не вдалося змінити пароль. Посилання могло втратити чинність або вже використане.'));
            else setMessage(t('Не удалось выполнить действие. Проверьте данные и соединение.','Не вдалося виконати дію. Перевірте дані та з’єднання.'));
        }finally{setPassword('');setRepeat('');setBusy(false);}
    }
    const enabled=!!options.emailPassword;
    return <section className="account-section email-auth" aria-label={t('Вход по email и паролю','Вхід за email і паролем')}>
        <div className="email-auth-tabs"><Button disabled={busy} variant={mode==='login'?'primary':'secondary'} onClick={()=>change('login')}>{t('Вход','Вхід')}</Button><Button disabled={busy} variant={mode==='register'?'primary':'secondary'} onClick={()=>change('register')}>{t('Регистрация','Реєстрація')}</Button></div>
        <form onSubmit={event=>void submit(event)}>
            {mode==='register'&&<label>{t('Имя','Ім’я')}<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>}
            {mode!=='reset'&&<label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>}
            {mode!=='forgot'&&<label>{mode==='reset'?t('Новый пароль','Новий пароль'):t('Пароль','Пароль')}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}
        {mode==='login'&&<Button type="button" className="account-forgot-password" variant="text" disabled={busy||!options.emailDelivery} onClick={()=>change('forgot')}>{t('Забыли пароль?','Забули пароль?')}</Button>}
            {(mode==='register'||mode==='reset')&&<><p className="email-auth-hint">{t('От 12 до 128 символов.','Від 12 до 128 символів.')}</p><label>{t('Повторите пароль','Повторіть пароль')}<input name="confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={repeat} onChange={e=>setRepeat(e.target.value)} disabled={busy}/></label></>}
            <Button type="submit" disabled={busy||!enabled||(mode==='forgot'&&!options.emailDelivery)}>{busy?t('Подождите…','Зачекайте…'):mode==='register'?t('Создать аккаунт','Створити акаунт'):mode==='forgot'?t('Отправить ссылку','Надіслати посилання'):mode==='reset'?t('Сохранить новый пароль','Зберегти новий пароль'):t('Войти','Увійти')}</Button>
        </form>
        {message&&<p role="status">{message}</p>}
    </section>;
}
