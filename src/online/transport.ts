import {api} from '../sync/client';
export type RaceMode='WORD_CHOICE_RACE'|'SENTENCE_RACE';
export type Scoring='FIRST_CORRECT'|'SPEED'|'ACCURACY';
export type QuestionCount=5|10|15|20;
export type Level='A1'|'A2'|'B1';
export type SearchOptions={seasonId:string;mode:RaceMode;level:Level;ranked:boolean;scoring:Scoring;questionCount:QuestionCount;searchType?:'AUTO'|'ROOM';targetQueueId?:string};
export type OpenGame=SearchOptions&{id:string;name:string;expiresAt:string};
export type Queue={id:string;status:string;matchId:string|null;expiresAt:string}|null;
export type Rating={seasonId:string;mode:RaceMode;level:Level;scoring:Scoring;value:number;games:number};
export type Lobby={serverTime:string;seasons:{id:string;startsAt:string;endsAt:string}[];queue:Queue;ratings:Rating[]};
export type Submission={roundId:string;token:string;requestId:string;answer:string};
export type MatchState={id:string;serverTime:string;current:{status:string;mode:RaceMode;level:Level;ranked:boolean;scoring:Scoring;questionCount:number;finishedAt:string|null;reason:string|null;seasonId:string};participants:{id:string;name:string;isYou:boolean;seat:number;score:number;leftAt:string|null}[];rounds:{id:string;number:number;status:string;reason:string|null;startsAt:string;deadlineAt:string;winnerId:string|null;token?:string;question?:{prompt:string;choices?:{id:string;text:string}[];tokens?:{id:string;text:string}[]};answers?:string[]}[];submissions:{roundId:string;accepted:boolean;correct:boolean;answer:string}[];ratingChanges:{seat:number;before:number;after:number}[];events:{sequence:string}[]};
export type LeaderboardEntry={place:number;name:string;value:number;games:number};
export interface DuelTransport{
    lobby():Promise<Lobby>;
    rooms():Promise<OpenGame[]>;
    join(options:SearchOptions):Promise<{matchId?:string;queueId?:string;expiresAt?:string}>;
    queue():Promise<Queue>;
    cancel():Promise<{matchId:string|null}>;
    read(id:string,after:string):Promise<MatchState>;
    submit(input:Submission):Promise<{accepted:boolean;correct?:boolean;reason?:string}>;
    leave(id:string):Promise<unknown>;
    leaders(options:SearchOptions):Promise<LeaderboardEntry[]>;
}
export const httpDuels:DuelTransport={
    rooms:()=>api('competition/rooms'),lobby:()=>api('competition/lobby'),join:options=>api('competition/queue','POST',options),queue:()=>api('competition/queue'),cancel:()=>api('competition/queue','DELETE'),
    read:(id,after)=>api(`competition/match?id=${encodeURIComponent(id)}&after=${encodeURIComponent(after)}`),submit:input=>api('competition/submit','POST',input),leave:matchId=>api('competition/leave','POST',{matchId}),
    leaders:options=>api(`competition/leaderboard?${new URLSearchParams({seasonId:options.seasonId,mode:options.mode,level:options.level,scoring:options.scoring})}`),
};
