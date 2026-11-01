import type {MatchState} from './transport';

// Results are revealed only from completed rounds returned by the server.
export function speedReview(match:MatchState|null,now:number){
    if(!match||match.current.scoring!=='SPEED')return null;
    const latest=match.rounds.at(-1);if(!latest)return null;
    const finished=['FINISHED','CANCELLED'].includes(match.current.status);
    const round=finished?latest:match.rounds.at(-2);
    const until=finished?Date.parse(match.current.finishedAt??'')+3000:Date.parse(latest.startsAt);
    if(!round?.question||!round.answers?.length||!['FINISHED','EXPIRED'].includes(round.status)||!Number.isFinite(until)||now>=until)return null;
    return {round,seconds:Math.min(3,Math.max(1,Math.ceil((until-now)/1000))),final:finished};
}
