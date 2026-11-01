import {writeFileSync} from 'node:fs';
import initialize from '@echogarden/espeak-ng-emscripten';
import {firstSteps} from '../src/data/firstSteps.ts';

const module=await initialize();
const voice=await new module.eSpeakNGWorker();
voice.set_voice('de');
function simplify(ipa,locale){
    let value=ipa.replace(/aɪ|aɛ/g,'АЙ').replace(/aʊ/g,'АУ').replace(/ɔø|ɔʏ|ɔɪ/g,'ОЙ').replace(/tʃ/g,'Ч').replace(/dʒ/g,'ДЖ').replace(/ts/g,'Ц');
    const sounds={a:'а',ɑ:'а',ɐ:'а',ɒ:'о',b:'б',c:'к',d:'д',e:locale==='uk'?'е':'э',ɛ:locale==='uk'?'е':'э',ə:locale==='uk'?'е':'э',ɜ:locale==='uk'?'е':'э',ɚ:locale==='uk'?'ер':'эр',f:'ф',g:locale==='uk'?'ґ':'г',ɡ:locale==='uk'?'ґ':'г',h:'х',i:locale==='uk'?'і':'и',ɪ:locale==='uk'?'і':'и',j:'й',k:'к',l:'л',m:'м',n:'н',ŋ:'нг',o:'о',ɔ:'о',p:'п',r:'р',ɾ:'р',ʁ:'р',ɹ:'р',s:'с',ʃ:'ш',t:'т',u:'у',ʊ:'у',v:'в',ʋ:'в',w:'в',x:'х',ç:'хь',y:'ю',ʏ:'ю',z:'з',ʒ:'ж',ø:'ё',œ:'ё','ː':':','ˈ':'','ˌ':'','ʔ':'','̩':'','̯':'','ʰ':'','ʲ':'ь'};
    value=[...value].map(char=>sounds[char]??char).join('').replaceAll('АЙ','ай').replaceAll('АУ','ау').replaceAll('ОЙ','ой').replaceAll('Ч','ч').replaceAll('ДЖ','дж').replaceAll('Ц','ц').replace(/\s+/g,' ').trim();
    if(locale==='uk')value=value.replaceAll('ё','ьо');
    if(/[a-zɑ-ʯ]/i.test(value))throw new Error(`Unmapped sound: ${ipa} → ${value}`);
    return value;
}
const entries={};
for(const section of firstSteps)for(const row of section.rows){
    const spoken=row.german.replaceAll('…','').replaceAll('’',"'");
    const result=voice.synthesize_ipa(spoken);
    if(result.code!==0||!result.ipa?.trim())throw new Error(`Phonemization failed: ${row.id}`);
    const ipa=result.ipa.replaceAll('_','').replaceAll('ɔø','ɔʏ').replace(/\s+/g,' ').trim()+(row.german.includes('…')?' …':'');
    entries[row.id]={german:row.german,ipa,ru:simplify(ipa,'ru'),uk:simplify(ipa,'uk')};
}
writeFileSync('src/data/firstStepsPronunciation.json',JSON.stringify({engine:'eSpeak NG · German · machine-generated',entries},null,2)+'\n');
console.log(`Generated German IPA and approximate RU/UK readings for ${Object.keys(entries).length} entries.`);
