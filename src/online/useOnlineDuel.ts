import {useCallback,useEffect,useRef,useState} from 'react';
import {httpDuels,type DuelTransport,type Lobby,type MatchState,type Queue,type SearchOptions,type Submission} from './transport';

function errorCode(error:unknown){const e=error as {code?:string;status?:number};return e?.code??(e?.status?`HTTP_${e.status}`:'NETWORK');}

export function useOnlineDuel(userId:string|undefined,transport:DuelTransport=httpDuels){
    const [lobby,setLobby]=useState<Lobby|null>(null),[queue,setQueue]=useState<Queue>(null),[matchId,setMatchId]=useState<string|null>(null),[match,setMatch]=useState<MatchState|null>(null);
    const [loading,setLoading]=useState(!!userId),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[expired,setExpired]=useState(false),[pending,setPending]=useState<Submission|null>(null),[sent,setSent]=useState(false),[offset,setOffset]=useState(0),[clock,setClock]=useState(Date.now());
    const live=useRef(false),cursor=useRef('0'),submitting=useRef(false),roundRef=useRef<string|null>(null),submissionGeneration=useRef(0);
    const pendingKey=`klar:account:${userId}:online-submit:v1`;
    const refresh=useCallback(async()=>{
        if(!userId)return;
        setLoading(true);setError(null);
        try{const data=await transport.lobby();if(!live.current)return;setLobby(data);setQueue(data.queue);if(data.queue?.matchId)setMatchId(data.queue.matchId);}
        catch(error){if(live.current)setError(errorCode(error));}finally{if(live.current)setLoading(false);}
    },[userId,transport]);
    useEffect(()=>{live.current=true;void refresh();return()=>{live.current=false;};},[refresh]);
    useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(timer);},[]);
    useEffect(()=>{
        if(!queue||queue.status!=='WAITING'||matchId)return;
        let stopped=false,timer:ReturnType<typeof setTimeout>;
        const poll=async()=>{try{const result=await transport.queue();if(stopped)return;setError(null);setQueue(result);if(result?.matchId)setMatchId(result.matchId);else if(!result)setExpired(true);}catch(error){if(!stopped)setError(errorCode(error));}finally{if(!stopped)timer=setTimeout(poll,document.hidden?5000:2000);}};
        void poll();return()=>{stopped=true;clearTimeout(timer);};
    },[queue?.id,queue?.status,matchId,transport]);
    useEffect(()=>{
        if(!matchId)return;
        let stopped=false,timer:ReturnType<typeof setTimeout>;cursor.current='0';roundRef.current=null;setMatch(null);setSent(false);setPending(null);
        const poll=async()=>{
            const started=Date.now();
            try{const result=await transport.read(matchId,cursor.current);if(stopped)return;setError(null);setMatch(old=>old&&Date.parse(old.serverTime)>Date.parse(result.serverTime)?old:result);setQueue(null);setOffset(Date.parse(result.serverTime)-(started+Date.now())/2);cursor.current=result.events.at(-1)?.sequence??cursor.current;
                const round=result.rounds.at(-1),done=['FINISHED','CANCELLED'].includes(result.current.status);
                if(round&&round.id!==roundRef.current){roundRef.current=round.id;submissionGeneration.current++;submitting.current=false;setBusy(false);setSent(false);setPending(null);}
                if(done||result.submissions.some(s=>s.roundId===round?.id)){setSent(true);setPending(null);localStorage.removeItem(pendingKey);}
                else{try{const saved=JSON.parse(localStorage.getItem(pendingKey)??'null');if(saved&&saved.roundId===round?.id&&typeof saved.answer==='string'&&typeof saved.token==='string'&&typeof saved.requestId==='string')setPending(saved);else if(saved&&saved.roundId!==round?.id)localStorage.removeItem(pendingKey);}catch{/* malformed local retry cannot be submitted */}}
                if(done)return;
            }catch(error){if(!stopped)setError(errorCode(error));}
            if(!stopped)timer=setTimeout(poll,document.hidden?5000:1200);
        };
        void poll();return()=>{stopped=true;clearTimeout(timer);};
    },[matchId,pendingKey,transport]);
    async function join(options:SearchOptions){if(busy)return;setBusy(true);setError(null);setExpired(false);try{const result=await transport.join(options);if(!live.current)return;if(result.matchId)setMatchId(result.matchId);else if(result.queueId&&result.expiresAt)setQueue({id:result.queueId,status:'WAITING',matchId:null,expiresAt:result.expiresAt});}catch(error){if(live.current)setError(errorCode(error));}finally{if(live.current)setBusy(false);}}
    async function cancel(){if(busy)return;setBusy(true);try{const result=await transport.cancel();if(!live.current)return;if(result.matchId)setMatchId(result.matchId);else setQueue(null);setError(null);}catch(error){if(live.current)setError(errorCode(error));}finally{if(live.current)setBusy(false);}}
    async function submit(answer?:string){
        const round=match?.rounds.at(-1);if(submitting.current||sent||!round?.token)return;
        const input=pending??(answer===undefined?null:{roundId:round.id,token:round.token,requestId:crypto.randomUUID(),answer});if(!input)return;
        const generation=++submissionGeneration.current;submitting.current=true;setBusy(true);setError(null);setPending(input);
        try{localStorage.setItem(pendingKey,JSON.stringify(input));await transport.submit(input);if(!live.current||generation!==submissionGeneration.current)return;setSent(true);setPending(null);localStorage.removeItem(pendingKey);
            // Fetch the closed round immediately, including the server-revealed answers.
            try{const result=await transport.read(matchId!,'0');if(live.current&&generation===submissionGeneration.current)setMatch(old=>old&&Date.parse(old.serverTime)>Date.parse(result.serverTime)?old:result);}catch{/* regular polling retries this read */}
        }
        catch(error){if(live.current&&generation===submissionGeneration.current)setError(errorCode(error));}finally{if(generation===submissionGeneration.current){submitting.current=false;if(live.current)setBusy(false);}} 
    }
    async function leave(){if(busy||!matchId)return;setBusy(true);try{await transport.leave(matchId);if(!live.current)return;const result=await transport.read(matchId,'0');if(live.current){setMatch(result);setError(null);}}catch(error){if(live.current)setError(errorCode(error));}finally{if(live.current)setBusy(false);}}
    function again(){setMatchId(null);setMatch(null);setPending(null);setSent(false);setError(null);cursor.current='0';void refresh();}
    return {lobby,queue,match,matchId,loading,busy,error,expired,pending,sent,now:clock+offset,refresh,join,cancel,submit,leave,again};
}
