import {Button, Card, PageIntro} from '../components/ui';
import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, Download, FileUp, Headphones, RotateCcw, Target } from 'lucide-react';
import { useLearning } from './LearningContext';
import { miniLessons, lessonCompleted } from './lessons';
import { skills, validLearning, type LearningState, type SkillMode } from './model';
import { modeNames } from './WordReview';
import WordReview from './WordReview';
import MiniLessons from './MiniLessons';
import Mistakes from './Mistakes';
import { useNow } from '../hooks/useNow';
import { useLocale } from '../i18n/Locale';
import WeeklyReport from './WeeklyReport';
export type LearningTab = 'plan' | 'lessons' | 'review' | 'mistakes' | 'skills' | 'week';
export default function LearningCenter({ initialTab = 'plan', known=0,activityDays }: {
    initialTab?: LearningTab;
    known?:number;
    activityDays?:string[];
}) {
    const { state, restore, storageError } = useLearning();
    const { t } = useLocale();
    const [tab, setTab] = useState<LearningTab>(initialTab), [lesson, setLesson] = useState<string | undefined>();
    const [recommendedMode, setRecommendedMode] = useState<SkillMode | undefined>();
    const [pending, setPending] = useState<LearningState | null>(null), [previous, setPrevious] = useState<LearningState | null>(null), [message, setMessage] = useState('');
    const file = useRef<HTMLInputElement>(null);
    const tabs = [['plan', 'Мои 10 минут', 'Мої 10 хвилин'], ['lessons', 'Мини-уроки', 'Мініуроки'], ['review', 'Повторение', 'Повторення'], ['mistakes', 'Мои ошибки', 'Мої помилки'], ['skills', 'Мои навыки', 'Мої навички'],['week','Моя неделя','Мій тиждень']] as const;
    function openReview() { const next = Object.entries(state.skills).filter(([, s]) => s.due <= Date.now()).sort((a, b) => a[1].due - b[1].due)[0]; setRecommendedMode(next ? next[0].split(':')[0] as SkillMode : undefined); setTab('review'); }
    function backup() { const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'klar-learning-backup.json'; a.click(); URL.revokeObjectURL(url); }
    async function read(f: File | undefined) { setMessage(''); setPending(null); if (!f)
        return; try {
        if (f.size > 8000000)
            throw new Error(t('Файл больше 8 МБ.', 'Файл більший за 8 МБ.'));
        const data: unknown = JSON.parse(await f.text());
        if (!validLearning(data))
            throw new Error(t('Формат учебной копии не подходит. Ничего не изменено.', 'Формат навчальної копії не підходить. Нічого не змінено.'));
        setPending(data);
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : t('Не удалось прочитать файл.', 'Не вдалося прочитати файл.'));
    } if (file.current)
        file.current.value = ''; }
    return <><PageIntro><span className="eyebrow">KLAR · {t('УЧИМСЯ ПОЛЬЗОВАТЬСЯ ЯЗЫКОМ', 'ВЧИМОСЯ КОРИСТУВАТИСЯ МОВОЮ')}</span><h1>{t('От знания — к своей речи.', 'Від знання — до власного мовлення.')}</h1><p>{t('Связанные уроки, слушание, письменные ответы и повторение слабых мест. Без подписки и платных запросов.', 'Пов’язані уроки, слухання, письмові відповіді й повторення слабких місць. Без підписки та платних запитів.')}</p></PageIntro>{storageError && <p className="learning-note" role="alert">{t(storageError, 'Не вдалося зберегти дані у браузері. Завантажте копію перед виходом.')}</p>}<div className="learning-center-tabs" role="tablist" aria-label={t('Учебный центр', 'Навчальний центр')}>{tabs.map(([id, ru, uk]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setLesson(undefined); }}>{t(ru, uk)}{id === 'mistakes' && <small>{Object.values(state.mistakes).filter(m => !m.resolved).length}</small>}</button>)}</div>
 {tab === 'plan' ? <AdaptivePlan onReview={openReview} onMistakes={() => setTab('mistakes')} onLesson={id => { setLesson(id); setTab('lessons'); }}/> : tab === 'lessons' ? <MiniLessons key={lesson ?? 'catalog'} initial={lesson}/> : tab === 'review' ? <WordReview initialMode={recommendedMode}/> : tab === 'mistakes' ? <Mistakes /> : tab==='week'?<WeeklyReport activityDays={activityDays} known={known} onReview={openReview} onMistakes={()=>setTab('mistakes')}/>:<SkillOverview />}
 <details className="learning-backup"><summary>{t('Сохранение и перенос учебного прогресса', 'Збереження й перенесення навчального прогресу')}</summary><p>{t('Уроки, ошибки и повторение хранятся в этом браузере. Эта копия переносит новый учебный центр; прежние списки слов и видеокурс хранятся отдельно.', 'Уроки, помилки й повторення зберігаються в цьому браузері. Ця копія переносить новий навчальний центр; попередні списки слів і відеокурс зберігаються окремо.')}</p><div className="learning-actions"><Button onClick={backup} variant="secondary"><Download size={16}/>{t('Скачать копию', 'Завантажити копію')}</Button><Button onClick={() => file.current?.click()} variant="secondary"><FileUp size={16}/>{t('Открыть копию', 'Відкрити копію')}</Button></div><input hidden type="file" accept="application/json,.json" ref={file} onChange={e => void read(e.target.files?.[0])}/>{pending && <div className="learning-note"><p>{Object.keys(pending.skills).length} {t('проверок слов', 'перевірок слів')} · {Object.keys(pending.lessons).length} {t('уроков с отметками', 'уроків із позначками')}</p><p>{t('Применение заменит данные учебного центра. Сначала скачайте текущую копию.', 'Застосування замінить дані навчального центру. Спочатку завантажте поточну копію.')}</p><Button onClick={() => { setPrevious(state); restore(pending); setPending(null); setMessage(t('Учебная копия применена.', 'Навчальну копію застосовано.')); }} variant="primary">{t('Заменить учебный прогресс', 'Замінити навчальний прогрес')}</Button><Button onClick={() => setPending(null)} variant="secondary">{t('Отмена', 'Скасувати')}</Button></div>}{previous && <Button onClick={() => { restore(previous); setPrevious(null); setMessage(t('Предыдущие данные восстановлены.', 'Попередні дані відновлено.')); }} variant="text">{t('Отменить последний импорт', 'Скасувати останній імпорт')}</Button>}{message && <p role="status">{message}</p>}</details></>;
}
export function AdaptivePlan({ onReview, onMistakes, onLesson }: {
    onReview: () => void;
    onMistakes: () => void;
    onLesson: (id: string) => void;
}) {
    const { state } = useLearning();
    const { t, locale } = useLocale();
    const now = useNow();
    const due = Object.values(state.skills).filter(s => s.due <= now).length;
    const errors = Object.values(state.mistakes).filter(m => !m.resolved);
    const next = miniLessons.find(l => !lessonCompleted(l, state.lessons[l.id] ?? [])) ?? miniLessons[0];
    return <><div className="learning-section-heading"><h2>{t('План под ваши результаты', 'План під ваші результати')}</h2><p>{t('Сначала просроченное повторение и ошибки, затем следующий незавершённый урок. Время — ориентир; можно делать шаги отдельно.', 'Спочатку прострочене повторення й помилки, потім наступний незавершений урок. Час — орієнтир; можна виконувати кроки окремо.')}</p></div><div className="adaptive-plan-grid"><button onClick={due ? onReview : () => onLesson(next.id)}><span className="resource-icon sage">{due ? <RotateCcw /> : <BookOpen />}</span><small>≈ 3 {t('мин', 'хв')}</small><h3>{due ? t('Повторить то, что подошло по сроку', 'Повторити те, що підійшло за строком') : next.title[locale]}</h3><p>{due ? `${due} ${t('слов и навыков ожидают повторения', 'слів і навичок очікують повторення')}` : next.goal[locale]}</p><ArrowRight size={19}/></button><button onClick={errors.length ? onMistakes : onReview}><span className="resource-icon lilac"><Target /></span><small>≈ 3 {t('мин', 'хв')}</small><h3>{errors.length ? t('Вернуться к ошибкам', 'Повернутися до помилок') : t('Проверить слова без подсказки', 'Перевірити слова без підказки')}</h3><p>{errors.length ? `${errors.length} ${t('активных трудностей', 'активних труднощів')}` : t('Выберите письмо или вспоминание перевода.', 'Виберіть письмо або пригадування перекладу.')}</p><ArrowRight size={19}/></button><button onClick={() => onLesson(next.id)}><span className="resource-icon apricot"><Headphones /></span><small>≈ 4 {t('мин', 'хв')}</small><h3>{t('Послушать и сказать самому', 'Послухати й сказати самому')}</h3><p>{next.title[locale]} · {t('диалог и своя запись', 'діалог і власний запис')}</p><ArrowRight size={19}/></button></div><p className="learning-note">{t('Для аудио нужен немецкий голос устройства. В мини-уроке можно открыть текст, если озвучка недоступна; чтение при этом не засчитывается как проверка слуха.', 'Для аудіо потрібен німецький голос пристрою. У мініуроці можна відкрити текст, якщо озвучення недоступне; читання при цьому не зараховується як перевірка слуху.')}</p></>;
}
function SkillOverview() {
    const { state } = useLearning();
    const { t, locale } = useLocale();
    return <><div className="learning-section-heading"><h2>{t('Что уже проверено', 'Що вже перевірено')}</h2><p>{t('Навыки считаются отдельно. Ступень повторения показывает учебную историю, а не подтверждённый уровень CEFR.', 'Навички рахуються окремо. Ступінь повторення показує навчальну історію, а не підтверджений рівень CEFR.')}</p></div><div className="learning-mode-grid">{skills.map(mode => { const entries = Object.entries(state.skills).filter(([key]) => key.startsWith(mode + ':')).map(([, v]) => v); return <Card className="learning-panel" key={mode} as="article"><h3>{modeNames[mode][locale]}</h3><b className="learning-big-number">{entries.length}</b><p>{t('разных слов проверено', 'різних слів перевірено')}</p><p>{entries.filter(s => s.stage >= 3).length} {t('дошли до повторения через 3 дня', 'дійшли до повторення через 3 дні')}</p><p>{entries.filter(s => s.due <= Date.now()).length} {t('пора повторить', 'час повторити')}</p></Card>; })}</div><p className="course-caption">{t('Старые отметки «Знаю» сохранены в словаре. Они не переносятся автоматически в проверенные навыки: самопроверка и выполненное задание — разные данные.', 'Старі позначки «Знаю» збережено у словнику. Вони не переносяться автоматично до перевірених навичок: самооцінка й виконане завдання — різні дані.')}</p></>;
}
