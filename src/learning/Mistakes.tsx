import {TextInput} from '../components/ui';
import { Badge, Button, Card } from '../components/ui';
import { useState } from 'react';
import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { useLearning } from './LearningContext';
import { acceptedAnswer, acceptedSpelling, answerFeedback, type Mistake } from './model';
import { useSpeech } from '../hooks/useSpeech';
import { useLocale } from '../i18n/Locale';
export default function Mistakes() {
    const { state } = useLearning();
    const { t } = useLocale();
    const [showResolved, setShowResolved] = useState(false), [selected, setSelected] = useState<Mistake | null>(null);
    const active = Object.values(state.mistakes).filter(m => !m.resolved);
    const list = Object.values(state.mistakes).filter(m => showResolved || !m.resolved).sort((a, b) => a.due - b.due);
    return <><div className="learning-section-heading"><h2>{t('Мои ошибки', 'Мої помилки')}</h2><p>{t('Здесь собираются ошибки словаря, глаголов, артиклей, предложений и мини-уроков. Повторите ответ сейчас, затем после паузы.', 'Тут збираються помилки словника, дієслів, артиклів, речень і мініуроків. Повторіть відповідь зараз, потім після паузи.')}</p></div><label className="learning-checkbox"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}/>{t('Показывать закреплённые', 'Показувати закріплені')}</label><p className="course-caption">{active.length} {t('активных трудностей. Закрепление: два верных повторения, причём второе — не раньше чем через сутки после ошибки.', 'активних труднощів. Закріплення: два правильні повторення, причому друге — не раніше ніж через добу після помилки.')}</p>{selected ? <MistakeExercise key={selected.key} mistake={selected} onBack={() => setSelected(null)}/> : <div className="mistake-list">{list.map(m => <article key={m.key}><Badge>{m.domain} · {m.failures}×</Badge><h3>{m.mode === 'listening' ? t('Слово на слух', 'Слово на слух') : m.prompt}</h3><p>{t('Ваш прошлый ответ', 'Ваша попередня відповідь')}: <b>{m.answer}</b></p><small>{m.resolved ? t('Закреплено', 'Закріплено') : m.due <= Date.now() ? t('Пора повторить', 'Час повторити') : t('Повтор после', 'Повтор після') + ' ' + new Date(m.due).toLocaleString()}</small><Button onClick={() => setSelected(m)} variant="secondary"><RotateCcw size={16}/>{t('Повторить', 'Повторити')}</Button></article>)}</div>}{!list.length && <div className="learning-finished"><CheckCircle2 size={32}/><h3>{t('Здесь пока нет ошибок', 'Тут поки немає помилок')}</h3><p>{t('Они появятся после новых попыток. Прошлые ответы до этого обновления не восстанавливаются.', 'Вони з’являться після нових спроб. Старі відповіді до цього оновлення не відновлюються.')}</p></div>}</>;
}
function MistakeExercise({ mistake, onBack }: {
    mistake: Mistake;
    onBack: () => void;
}) {
    const { record } = useLearning();
    const { t } = useLocale();
    const [answer, setAnswer] = useState(''), [checked, setChecked] = useState(false), [played, setPlayed] = useState(false);
    const speech = useSpeech();
    const correct = mistake.caseSensitive ? mistake.answers.includes(answer.trim()) : (mistake.mode === 'spelling' || mistake.mode === 'listening' ? acceptedSpelling : acceptedAnswer)(answer, mistake.answers);
    function check() {
        if (checked || !answer.trim() || !!mistake.audio && !played)
            return;
        setChecked(true);
        record({ ...mistake, answer, correct });
    }
    return <Card className="learning-panel" as="section"><h3>{mistake.mode === 'listening' ? t('Послушайте слово и запишите его', 'Послухайте слово й запишіть його') : mistake.prompt}</h3>{mistake.audio && <div className="learning-actions"><Button onClick={async () => {
                if (await speech.speak(mistake.audio!))
                    setPlayed(true);
            }} variant="secondary"><Volume2 size={17}/>{t('Слушать', 'Слухати')}</Button><Button onClick={async () => {
                if (await speech.speak(mistake.audio!, .75))
                    setPlayed(true);
            }} variant="secondary">0,75×</Button></div>}{speech.message && <p className="speech-status" role="status">{t(speech.message)}</p>}<form onSubmit={e => { e.preventDefault(); check(); }}><label className="learning-answer-label">{t('Ваш ответ', 'Ваша відповідь')}<TextInput maxLength={1000} autoComplete="off" value={answer} onChange={e => setAnswer(e.target.value)} disabled={checked}/></label><Button disabled={checked || !answer.trim() || !!mistake.audio && !played} variant="primary">{t('Проверить', 'Перевірити')}</Button></form>{checked && <div className={`feedback ${correct ? 'success' : 'error'}`}><b>{correct ? t('Верно. Повторите позже для закрепления.', 'Правильно. Повторіть пізніше для закріплення.') : t(answerFeedback(answer, mistake.answers, mistake.domain))}</b><p>{mistake.answers[0]}</p><p>{mistake.explanation}</p></div>}<Button onClick={onBack} className="next" variant="text">{t('К списку ошибок', 'До списку помилок')}</Button></Card>;
}
