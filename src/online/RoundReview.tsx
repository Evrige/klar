import {Check,Clock3,X} from 'lucide-react';
import {useLocale} from '../i18n/Locale';
import type {MatchState} from './transport';
import {normalizeSentence} from '../data/sentences';
import type {speedReview} from './speedReview';

type Props={match:MatchState;review:NonNullable<ReturnType<typeof speedReview>>};
export default function RoundReview({match,review}:Props){
    const {t}=useLocale(),{round,seconds,final}=review;
    const own=match.submissions.find(s=>s.roundId===round.id),me=match.participants.find(p=>p.isYou);
    const won=round.winnerId===me?.id;
    return <section className="online-answer-review" aria-label={t('Разбор ответа','Розбір відповіді')}>
        <div className="online-review-timer" role="timer"><Clock3 size={18}/><span>{final?t('Итог матча через','Підсумок матчу за'):t('Следующий вопрос через','Наступне питання за')}</span><strong>{seconds}</strong></div>
        <h2 className="online-question" lang={match.current.mode==='WORD_CHOICE_RACE'?'de':undefined}>{round.question!.prompt}</h2>
        <p className={`online-review-outcome ${won?'is-correct':'is-incorrect'}`} role="status">{won?t('+1 вам','+1 вам'):round.winnerId?t('+1 сопернику','+1 супернику'):t('Время истекло','Час минув')}</p>
        {round.question!.choices?<div className="online-choices online-review-choices">{round.question!.choices.map((choice,i)=>{
            const correct=round.answers!.some(answer=>normalizeSentence(answer)===normalizeSentence(choice.text)),wrong=own?.answer===choice.id&&!correct;
            return <button key={choice.id} disabled className={correct?'is-correct':wrong?'is-incorrect':''}><small>{i+1}</small><span>{choice.text}</span>{correct?<Check size={20} aria-label={t('Правильный ответ','Правильна відповідь')}/>:wrong?<X size={20} aria-label={t('Неверный ответ','Неправильна відповідь')}/>:null}</button>;
        })}</div>:<div className="online-reviewed-sentence">{own&&!own.correct&&<p className="is-incorrect"><X size={18}/>{own.answer}</p>}<p className="is-correct"><Check size={18}/>{round.answers![0]}</p></div>}
    </section>;
}
