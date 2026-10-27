import { useEffect, useRef, useState } from 'react';
import { useStoredState } from './useStoredState';
import { chooseGermanVoice, germanVoices, nativeRecordings, waitForGermanVoices } from '../lib/speech';
const validSpeed=(v:unknown):v is number=>typeof v==='number'&&[.75,.9,1].includes(v);
export function useSpeech(){
 const [message,setMessage]=useState(''),[voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[playing,setPlaying]=useState(false);
 const [preferredVoice,setPreferredVoice]=useStoredState('klar:speech:voice','',(v):v is string=>typeof v==='string');
 const [rate,setRate]=useStoredState('klar:speech:rate',1,validSpeed);
 const audioRef=useRef<HTMLAudioElement|null>(null),utteranceRef=useRef<SpeechSynthesisUtterance|null>(null),requestRef=useRef(0);
 useEffect(()=>{
  const synth='speechSynthesis'in window?window.speechSynthesis:null;
  const refresh=()=>setVoices(synth?germanVoices(synth.getVoices()):[]);
  refresh();synth?.addEventListener('voiceschanged',refresh);
  return()=>{synth?.removeEventListener('voiceschanged',refresh);requestRef.current++;if(audioRef.current){audioRef.current.onended=null;audioRef.current.onerror=null;audioRef.current.pause();}if(utteranceRef.current){utteranceRef.current.onend=null;utteranceRef.current.onerror=null;synth?.cancel();}};
 },[]);
 function stop(){
  requestRef.current++;
  if(audioRef.current){audioRef.current.onended=null;audioRef.current.onerror=null;audioRef.current.pause();audioRef.current=null;}
  if('speechSynthesis'in window){if(utteranceRef.current){utteranceRef.current.onend=null;utteranceRef.current.onerror=null;}window.speechSynthesis.cancel();}
  utteranceRef.current=null;setPlaying(false);
 }
 async function speak(text:string){
  stop();setMessage('');const request=requestRef.current;
  const recording=nativeRecordings[text.trim().toLocaleLowerCase('de-DE')];
  if(recording){
   const audio=new Audio(recording.url);audioRef.current=audio;audio.playbackRate=rate;audio.preservesPitch=true;
   audio.onended=()=>{if(request===requestRef.current)setPlaying(false);};
   try{setPlaying(true);await audio.play();if(request!==requestRef.current)return;setMessage('Запись носителя языка · Jeuwre.');return;}
   catch{if(request!==requestRef.current)return;setPlaying(false);setMessage('Запись недоступна. Используется немецкий голос устройства.');}
  }
  if(!('speechSynthesis'in window)){setMessage('Браузер не поддерживает синтез речи. Запись Hallo доступна отдельно.');return;}
  const synth=window.speechSynthesis;
  setMessage('Подготавливаем немецкий голос…');
  const available=await waitForGermanVoices(synth);
  if(request!==requestRef.current)return;
  setVoices(available);
  const voice=chooseGermanVoice(available,preferredVoice);
  if(!voice){setPlaying(false);setMessage('Немецкий голос недоступен. Откройте сайт в браузере с немецкими голосами или добавьте немецкий голос на устройстве.');return;}
  // Never let the browser choose a default voice of another language.
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=rate;utterance.pitch=1;utterance.volume=1;
  utteranceRef.current=utterance;
  utterance.onend=()=>{if(request===requestRef.current)setPlaying(false);};
  utterance.onerror=event=>{if(request!==requestRef.current)return;setPlaying(false);if(event.error!=='canceled'&&event.error!=='interrupted')setMessage('Не удалось воспроизвести. Выберите другой немецкий голос в настройках озвучки.');};
  setPlaying(true);setMessage(`Немецкий голос: ${voice.name}.`);
  synth.resume();synth.speak(utterance);
 }
 const selectedVoice=chooseGermanVoice(voices,preferredVoice);
 return {speak,stop,message,voices,preferredVoice,setPreferredVoice,rate,setRate,selectedVoice,playing};
}
