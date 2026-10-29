import {PageIntro, ProgressBar} from './ui';
import { Award, BookOpen, Flame, Gem, LockKeyhole, Puzzle, Star, Target, Trophy } from 'lucide-react';
import { achievementCards } from '../data/achievementTracks';
import type { AchievementStats, EarnedAchievements } from '../data/achievements';
import { useLocale } from '../i18n/Locale';
import { dayWord } from '../i18n/counts';
const icons = { book: BookOpen, star: Star, gem: Gem, target: Target, puzzle: Puzzle, flame: Flame };
export default function Achievements({ stats, earned, streak }: {
    stats: AchievementStats;
    earned: EarnedAchievements;
    streak: number;
}) {
    const { t, locale } = useLocale();
    const cards = achievementCards(stats, earned);
    const unlocked = cards.filter(c => c.rank > 0).length;
    const names = { locked: t('Ещё не открыто', 'Ще не відкрито'), bronze: t('Бронза', 'Бронза'), silver: t('Серебро', 'Срібло'), gold: t('Золото', 'Золото'), diamond: t('Алмаз', 'Діамант') };
    return <><PageIntro><span className="eyebrow">{t('ВАШИ ДОСТИЖЕНИЯ РАСТУТ ВМЕСТЕ С ВАМИ', 'ВАШІ ДОСЯГНЕННЯ ЗРОСТАЮТЬ РАЗОМ ІЗ ВАМИ')}</span><h1>{t('Каждая победа становится больше.', 'Кожна перемога стає більшою.')} <span>✦</span></h1><p>{t('Одна награда на каждый навык. Достигните цели — значок улучшится, а на карточке появится следующая ступень.', 'Одна нагорода на кожну навичку. Досягніть мети — значок покращиться, а на картці з’явиться наступний ступінь.')}</p></PageIntro>
 <div className="achievement-summary"><div><Trophy /><b>{unlocked} / {cards.length}</b><span>{t('категорий открыто', 'категорій відкрито')}</span></div><div><Flame /><b>{streak}</b><span>{dayWord(streak, locale)} · {t('текущая серия', 'поточна серія')}</span></div><div><Award /><b>{stats.streak}</b><span>{dayWord(stats.streak, locale)} · {t('лучшая серия', 'найкраща серія')}</span></div></div>
 <div className="achievement-evolution-legend">{(['bronze', 'silver', 'gold', 'diamond'] as const).map((skin, i) => <span key={skin} className={`evolution-label ${skin}`}><i />{names[skin]}{i < 3 && <b>→</b>}</span>)}</div>
 <div className="achievement-grid evolving-achievements">{cards.map(card => {
            const Icon = card.skin === 'diamond' ? Gem : icons[card.kind];
            const title = locale === 'uk' ? card.uk : card.ru;
            return <article key={card.id} className={`achievement-card evolution-card rank-${card.skin}`}><div className="evolution-top"><div className="achievement-emblem evolution-emblem"><Icon size={33}/>{card.rank === 0 && <LockKeyhole size={13} className="achievement-lock"/>}</div><span className="evolution-rank">{names[card.skin]}{card.rank > 4 && ` ${card.rank - 3}`}</span></div><h2>{title}</h2><p>{locale === 'uk' ? card.descriptionUk : card.description}</p><div className="evolution-current"><b>{card.current || '—'}</b><span>{card.current ? t('полученная ступень', 'отриманий ступінь') : t('первая цель впереди', 'перша мета попереду')}{card.id === 'streak' && card.current ? ` · ${dayWord(card.current, locale)}` : ''}</span></div>
 <div className="evolution-next"><span>{card.next ? t('Следующее улучшение', 'Наступне покращення') : t('Высшая ступень достигнута', 'Найвищого ступеня досягнуто')}</span>{card.next && <b>{card.next}{card.id === 'streak' ? ` ${dayWord(card.next, locale)}` : ''}</b>}</div><ProgressBar className="progress-track" role="progressbar" aria-label={`${title}: ${t('следующая ступень', 'наступний ступінь')}`} aria-valuemin={card.current} aria-valuemax={card.next ?? card.current} aria-valuenow={card.value} fillStyle={{ width: `${card.percent}%` }}/><small className="evolution-progress">{card.next ? `${Math.min(card.value, card.next)} / ${card.next}` : t('Все цели выполнены', 'Усі цілі виконано')}</small>{card.earnedAt && <span className="achievement-date">{t('Улучшено', 'Покращено')} {new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', { dateStyle: 'medium' }).format(new Date(card.earnedAt))}</span>}</article>;
        })}</div>
 <p className="course-caption">{t('Например, серия: 3 дня → бронза, 10 → серебро, 30 → золото, 60 → алмаз. Далее растёт алмазная ступень. Полученное оформление сохраняется при перерыве; прогресс идёт к следующей цели. Самооценка слов и проверенные ответы — разные награды.', 'Наприклад, серія: 3 дні → бронза, 10 → срібло, 30 → золото, 60 → діамант. Далі зростає діамантовий ступінь. Отримане оформлення зберігається після перерви; прогрес іде до наступної мети. Самооцінка слів і перевірені відповіді — різні нагороди.')}</p></>;
}
