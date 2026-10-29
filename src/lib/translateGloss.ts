import {decodeTranslation} from './translate.ts';
export async function translateGloss(word:string,locale:'ru'|'uk',signal:AbortSignal,fetcher:typeof fetch=fetch){
    if(!word.trim()||new TextEncoder().encode(word).byteLength>500)throw new Error('INVALID_WORD');
    const response=await fetcher(`https://api.mymemory.translated.net/get?${new URLSearchParams({q:word,langpair:`de|${locale}`,mt:'1'})}`,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if(!response.ok)throw new Error('TRANSLATION_UNAVAILABLE');
    const data=await response.json();
    const raw=data?.responseData?.translatedText;
    if(data?.quotaFinished||Number(data?.responseStatus)!==200||typeof raw!=='string'||/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/i.test(raw))throw new Error('TRANSLATION_UNAVAILABLE');
    const result=decodeTranslation(raw);
    if(!result||result.length>1000)throw new Error('INVALID_TRANSLATION');
    return result;
}
