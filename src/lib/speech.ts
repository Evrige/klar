export type VoiceInfo={voiceURI:string;name:string;lang:string;localService:boolean;default:boolean};
export function germanVoices<T extends VoiceInfo>(voices:readonly T[]):T[]{
 const score=(voice:VoiceInfo)=>{
  const language=voice.lang.replaceAll('_','-').toLowerCase();
  return (language==='de-de'?100:0)+(/natural|neural|premium|enhanced/i.test(voice.name)?60:0)+(/google/i.test(voice.name)?30:0)+(voice.default?1:0);
 };
 return voices.filter(v=>/^de(?:-|$)/i.test(v.lang.replaceAll('_','-'))).sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
}
export function chooseGermanVoice<T extends VoiceInfo>(voices:readonly T[],preferred=''):T|undefined{
 const available=germanVoices(voices);
 return available.find(v=>v.voiceURI===preferred)??available[0];
}
export function waitForGermanVoices(synth:SpeechSynthesis,timeout=2000):Promise<SpeechSynthesisVoice[]>{
 const loaded=germanVoices(synth.getVoices());
 if(loaded.length)return Promise.resolve(loaded);
 return new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);synth.removeEventListener('voiceschanged',check);resolve(germanVoices(synth.getVoices()));};
  const check=()=>{if(germanVoices(synth.getVoices()).length)finish();};
  const timer=setTimeout(finish,timeout);
  synth.addEventListener('voiceschanged',check);
  check();
 });
}
export const nativeRecordings:Record<string,{url:string;author:string;source:string;license:string}>={
 hallo:{url:'/audio/de/hallo.ogg',author:'Jeuwre',source:'https://commons.wikimedia.org/wiki/File:De-Hallo.ogg',license:'https://creativecommons.org/licenses/by-sa/4.0/'}
};
