import {TextInput} from './ui';
import { Badge, Button, PageIntro, ProgressBar } from './ui';
import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, Download, ExternalLink, FileUp, GraduationCap, LockKeyhole, Play, Search } from 'lucide-react';
import { blankLesson, courseLessons, courseLevels, lessonComplete, mergeCourseProgress, nextLesson, parseCourseImport, supplementary, type CourseLevel, type CourseProgress, type LessonRecord } from '../data/course';
import { useLocale } from '../i18n/Locale';
type Props = {
    initialLevel?: CourseLevel;
    progress: CourseProgress;
    onChange: (id: string, record: LessonRecord) => void;
    onImport: (progress: CourseProgress) => void;
    onPractice: (page: 'rules' | 'vocabulary' | 'verbs' | 'articles' | 'sentences') => void;
    onActivity: () => void;
};
export default function Course({ initialLevel, progress, onChange, onImport, onPractice, onActivity }: Props) {
    const { t } = useLocale();
    const next = nextLesson(progress);
    const initial = initialLevel ? (courseLessons.find(l => l.level === initialLevel && !lessonComplete(progress[l.id])) ?? courseLessons.find(l => l.level === initialLevel) ?? next) : next;
    const [level, setLevel] = useState<CourseLevel>(initial.level), [selected, setSelected] = useState(initial.id), [query, setQuery] = useState(''), [view, setView] = useState<'lessons' | 'extra'>('lessons');
    const [pending, setPending] = useState<CourseProgress | null>(null), [message, setMessage] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const lesson = courseLessons.find(l => l.id === selected)!;
    const record = progress[lesson.id] ?? blankLesson();
    const available = courseLessons.filter(l => l.level === level);
    const filtered = available.filter(l => `${l.number} ${l.sourceTitle}`.toLowerCase().includes(query.toLowerCase()));
    const completed = courseLessons.filter(l => lessonComplete(progress[l.id])).length;
    function change(field: 'video' | 'practice', value: boolean) {
        onChange(lesson.id, { ...record, [field]: value });
        if (value)
            onActivity();
    }
    function selectLevel(value: CourseLevel) {
        setLevel(value);
        setQuery('');
        const first = courseLessons.find(l => l.level === value && !lessonComplete(progress[l.id])) ?? courseLessons.find(l => l.level === value);
        if (first)
            setSelected(first.id);
    }
    async function load(file: File | undefined) {
        setMessage('');
        setPending(null);
        if (!file)
            return;
        try {
            if (file.size > 5000000)
                throw new Error(t('Файл слишком большой (максимум 5 МБ).', 'Файл завеликий (максимум 5 МБ).'));
            setPending(parseCourseImport(JSON.parse(await file.text())));
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : t('Не удалось прочитать файл.', 'Не вдалося прочитати файл.'));
        }
        if (fileRef.current)
            fileRef.current.value = '';
    }
    function backup() { const payload = { version: 1, lessons: courseLessons.map(l => ({ id: l.id, ...(progress[l.id] ?? blankLesson()) })) }; const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'klar-course-progress.json'; a.click(); URL.revokeObjectURL(url); }
    return <><PageIntro><span className="eyebrow">GERMAN GALAXY · {t('ВАШ УЧЕБНЫЙ МАРШРУТ', 'ВАШ НАВЧАЛЬНИЙ МАРШРУТ')}</span><h1>{t('От первого Hallo — дальше.', 'Від першого Hallo — далі.')}<span> ✦</span></h1><p>{t('228 видеоуроков A0–B2 из вашей платформы обучения. Просмотр, практика и заметки в одном месте.', '228 відеоуроків A0–B2 з вашої навчальної платформи. Перегляд, практика й нотатки в одному місці.')}</p></PageIntro>
 <section className="course-summary"><span className="gradient-icon"><GraduationCap /></span><div><h2>{t('Ваш маршрут', 'Ваш маршрут')}</h2><p>{completed} / {courseLessons.length} · {t('завершено: видео и практика', 'завершено: відео та практика')}</p><ProgressBar className="progress-track" fillStyle={{ width: `${completed / courseLessons.length * 100}%` }}/></div><Button onClick={() => { setSelected(next.id); setLevel(next.level); setView('lessons'); }} variant="primary">{t('Продолжить', 'Продовжити')} <ArrowRight size={17}/></Button></section>
 <div className="course-levels" aria-label={t('Уровни курса', 'Рівні курсу')}>{courseLevels.map((l, i) => { const lessons = courseLessons.filter(s => s.level === l); return <button key={l} className={level === l ? 'selected' : ''} disabled={!lessons.length} onClick={() => selectLevel(l)}><span className={`level-orb orb-${i % 4}`}>{l}</span><b>{l === 'A0' ? t('С нуля', 'З нуля') : l}</b><small>{lessons.length ? `${lessons.filter(s => lessonComplete(progress[s.id])).length} / ${lessons.length}` : t('Готовится', 'Готується')}</small>{!lessons.length && <LockKeyhole size={13}/>}</button>; })}</div>
 <p className="course-caption">{t('A0 — подготовительный старт. B2: доступные 28 уроков, полнота программы не подтверждена. C1/C2 готовятся. Завершение курса не является подтверждением уровня языка.', 'A0 — підготовчий старт. B2: доступні 28 уроків, повноту програми не підтверджено. C1/C2 готуються. Завершення курсу не підтверджує рівень мови.')}</p>
 <div className="trainer-toolbar"><div className="rules-nav"><button className={view === 'lessons' ? 'active' : ''} onClick={() => setView('lessons')}>{t('Уроки', 'Уроки')}</button><button className={view === 'extra' ? 'active' : ''} onClick={() => setView('extra')}>{t('Дополнительные видео', 'Додаткові відео')} · {supplementary.length}</button></div><div className="course-tools"><Button onClick={() => fileRef.current?.click()} variant="secondary"><FileUp size={15}/>{t('Импорт', 'Імпорт')}</Button><Button onClick={backup} variant="secondary"><Download size={15}/>{t('Сохранить копию', 'Зберегти копію')}</Button></div><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => void load(e.target.files?.[0])}/></div>
 {pending && <section className="import-preview"><h3>{t('Предварительный просмотр импорта', 'Попередній перегляд імпорту')}</h3><p>{Object.keys(pending).length} {t('уроков найдено. Текущие отметки сохранятся, заметки будут объединены.', 'уроків знайдено. Поточні позначки збережуться, нотатки буде об’єднано.')}</p><p>{Object.values(pending).filter(lessonComplete).length} {t('полностью завершённых уроков', 'повністю завершених уроків')}</p><Button onClick={() => {
                try {
                    onImport(mergeCourseProgress(progress, pending));
                    setPending(null);
                    setMessage(t('Прогресс импортирован.', 'Прогрес імпортовано.'));
                }
                catch (error) {
                    setMessage(error instanceof Error ? error.message : t('Не удалось применить импорт.', 'Не вдалося застосувати імпорт.'));
                }
            }} variant="primary">{t('Применить импорт', 'Застосувати імпорт')}</Button><Button onClick={() => setPending(null)} variant="secondary">{t('Отмена', 'Скасувати')}</Button></section>}{message && <p role="status" className="course-caption">{t(message)}</p>}
 {view === 'extra' ? <div className="extra-videos">{supplementary.map(v => <a href={`https://www.youtube.com/watch?v=${v.id}`} key={v.id} target="_blank" rel="noreferrer"><Play size={20}/><span>{v.title}<small>{t('Оригинальное видео · русский', 'Оригінальне відео · російська')}</small></span><ExternalLink size={16}/></a>)}</div> : <div className="course-layout"><aside className="lesson-list"><label className="search"><Search size={17}/><TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Номер или название…', 'Номер або назва…')} aria-label={t('Поиск урока', 'Пошук уроку')}/></label><div>{filtered.map(l => <button key={l.id} aria-current={selected === l.id ? 'step' : undefined} className={selected === l.id ? 'selected' : ''} onClick={() => setSelected(l.id)}><span className={lessonComplete(progress[l.id]) ? 'lesson-number done' : 'lesson-number'}>{lessonComplete(progress[l.id]) ? <Check size={16}/> : l.number}</span><span><b>{l.level} · {t('Урок', 'Урок')} {l.number}</b><small>{progress[l.id]?.video ? t('Видео просмотрено', 'Відео переглянуто') : t('Видео и практика', 'Відео та практика')}</small></span><ArrowRight size={14}/></button>)}{!filtered.length && <p className="course-caption">{t('Ничего не найдено', 'Нічого не знайдено')}</p>}</div></aside>
 <article className="course-detail" key={lesson.id}><div className="section-heading"><Badge>{lesson.level} · {t('Урок', 'Урок')} {lesson.number}</Badge>{lessonComplete(record) && <span className="completed-chip"><CheckCircle2 size={15}/>{t('Завершён', 'Завершено')}</span>}</div><h2>{t('Ваш следующий шаг', 'Ваш наступний крок')}</h2><p className="original-title">{lesson.sourceTitle}</p><p className="course-caption">{t('Название и язык оригинала: русский. Автор курса — German Galaxy.', 'Назва й мова оригіналу: російська. Автор курсу — German Galaxy.')}</p><a className="video-launch" href={lesson.url} target="_blank" rel="noreferrer"><span><Play size={27}/></span><div><b>{t('Смотреть урок на YouTube', 'Дивитися урок на YouTube')}</b><small>{t('Видео откроется в новой вкладке', 'Відео відкриється в новій вкладці')}</small></div><ExternalLink size={18}/></a>
 <ol className="lesson-steps"><li>{t('Посмотрите видео и повторите примеры вслух.', 'Перегляньте відео й повторіть приклади вголос.')}</li><li>{t('Выпишите новые слова, правило и свои вопросы.', 'Випишіть нові слова, правило й свої запитання.')}</li><li>{t('Пройдите соответствующую практику в приложении автора German Galaxy или выполните самостоятельные задания по теме.', 'Пройдіть відповідну практику в застосунку автора German Galaxy або виконайте самостійні завдання з теми.')}</li><li>{t('Отметьте выполненное и сохраните результат в заметках.', 'Позначте виконане та збережіть результат у нотатках.')}</li></ol>
 <div className="lesson-checks"><label><input type="checkbox" checked={record.video} onChange={e => change('video', e.target.checked)}/><span>{t('Видео просмотрено', 'Відео переглянуто')}</span></label><label><input type="checkbox" checked={record.practice} onChange={e => change('practice', e.target.checked)}/><span>{t('Практика выполнена', 'Практику виконано')}</span></label></div><label className="lesson-note">{t('Мои заметки и вопросы', 'Мої нотатки й запитання')}<textarea maxLength={10000} rows={4} value={record.note} onChange={e => onChange(lesson.id, { ...record, note: e.target.value })} placeholder={t('Что понял? Что стоит повторить?', 'Що зрозумів? Що варто повторити?')}/></label>
 <section className="course-practice"><h3><BookOpen size={18}/>{t('Практика в Klar', 'Практика в Klar')}</h3><p>{t('Выберите раздел по теме просмотренного урока. Это общие тренажёры Klar: соответствие конкретному видео пока не проверено.', 'Виберіть розділ за темою переглянутого уроку. Це загальні тренажери Klar: відповідність конкретному відео поки не перевірено.')}</p><div>{([['rules', 'Правила', 'Правила'], ['vocabulary', 'Слова', 'Слова'], ['verbs', 'Глаголы', 'Дієслова'], ['articles', 'Артикли', 'Артиклі'], ['sentences', 'Предложения', 'Речення']] as const).map(([id, ru, uk]) => <Button key={id} onClick={() => onPractice(id)} variant="secondary">{t(ru, uk)}<ArrowRight size={14}/></Button>)}</div></section>
 <div className="lesson-navigation"><Button disabled={courseLessons.indexOf(lesson) === 0} onClick={() => { const l = courseLessons[courseLessons.indexOf(lesson) - 1]; setSelected(l.id); setLevel(l.level); }} variant="secondary"><ChevronLeft size={16}/>{t('Предыдущий', 'Попередній')}</Button><Button disabled={courseLessons.indexOf(lesson) === courseLessons.length - 1} onClick={() => { const l = courseLessons[courseLessons.indexOf(lesson) + 1]; setSelected(l.id); setLevel(l.level); }} variant="primary">{t('Следующий урок', 'Наступний урок')}<ArrowRight size={16}/></Button></div></article></div>}</>;
}
