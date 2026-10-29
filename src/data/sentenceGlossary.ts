import {verbs} from './verbs.ts';
export type WordGloss={word:string;translation:string;note?:string;known:boolean};
const source=`
ich|я|я
du|ты|ти
er|он|він
sie|она / они / Вы — по контексту|вона / вони / Ви — за контекстом
es|оно / это|воно / це
wir|мы|ми
ihr|вы (несколько человек)|ви (кілька людей)
dich|тебя / тебе (Akkusativ)|тебе (Akkusativ)
deine|твоя / твою|твоя / твою
meinem|моему / моим (Dativ)|моєму / моїм (Dativ)
heute|сегодня|сьогодні
gestern|вчера|вчора
morgen|завтра|завтра
hier|здесь|тут
jeden|каждый|кожен
tag|день|день
letzte|прошлая / прошлую|минула / минулу
woche|неделя / неделю|тиждень
wochenende|выходные|вихідні
abend|вечер|вечір
abendessen|ужин|вечеря
deutsch|немецкий язык|німецька мова
englisch|английский язык|англійська мова
wörter|слова|слова
neue|новые|нові
grammatik|грамматика|граматика
buch|книга / книгу|книга / книгу
zeitung|газета / газету|газета / газету
nachricht|сообщение|повідомлення
brief|письмо|лист
wasser|вода / воду|вода / воду
tee|чай|чай
kaffee|кофе|кава
saft|сок|сік
brot|хлеб|хліб
apfel|яблоко|яблуко
suppe|суп|суп
salat|салат|салат
ticket|билет|квиток
fahrkarte|проездной билет|проїзний квиток
frisches|свежий / свежее|свіжий / свіже
fußball|футбол|футбол
tennis|теннис|теніс
basketball|баскетбол|баскетбол
gitarre|гитара|гітара
büro|офис|офіс
schule|школа / школе|школа / школі
krankenhaus|больница / больнице|лікарня / лікарні
reis|рис|рис
nudeln|макароны|макарони
freund|друг / друга|друг / друга
freunden|друзьями (Dativ, мн. число)|друзями (Dativ, множина)
mit|с (требует Dativ)|з (потребує Dativ)
gut|хорошо|добре
gern|охотно; действие нравится|охоче; дія подобається
auto|автомобиль / машина|автомобіль / машина
kein|нет / никакой; отрицание существительного|немає / жодний; заперечення іменника
nicht|не|не
teuer|дорого / дорогой|дорого / дорогий
zeit|время|час
berlin|Берлин|Берлін
bus|автобус|автобус
schwester|сестра / сестру|сестра / сестру
bruder|брат / брату|брат / братові
mann|мужчина / мужчину|чоловік / чоловіка
tisch|стол / столе|стіл / столі
sieben|семь|сім
uhr|час / часов (при указании времени)|година / годин (під час зазначення часу)
um|в (точное время)|о (точний час)
in|в|у / в
im|в; in + dem|у / в; in + dem
am|в / на; an + dem|у / на; an + dem
nach|в / к (направление)|до / у (напрямок)
zu|к / в; значение зависит от выражения|до / у; значення залежить від виразу
hause|дом; nach Hause — домой, zu Hause — дома|дім; nach Hause — додому, zu Hause — вдома
auf|на|на
an|на / у / к|на / біля / до
was|что|що
wann|когда|коли
wo|где|де
wie|как|як
weil|потому что|тому що
dass|что (союз)|що (сполучник)
wenn|когда / если|коли / якщо
deshalb|поэтому|тому
schwimmen|плавать|плавати
sitzen|сидеть|сидіти
besuchen|посещать / навещать|відвідувати
gearbeitet|работал(а) / работали|працював(-ла) / працювали
gelernt|учил(а) / учили|вивчав(-ла) / вивчали
gelesen|читал(а) / читали|читав(-ла) / читали
getrunken|пил(а) / пили|пив(-ла) / пили
gegessen|ел(а) / ели|їв / їла / їли
gekauft|купил(а) / купили|купив(-ла) / купили
gespielt|играл(а) / играли|грав(-ла) / грали
gekocht|готовил(а) / готовили|готував(-ла) / готували
gegangen|пошёл / пошла / пошли|пішов / пішла / пішли
`;
const lexicon=new Map(source.trim().split('\n').map(line=>{const [key,ru,uk]=line.split('|');return [key,{ru,uk}] as const;}));
const articles=new Set(['der','die','das','dem','den','des','ein','eine','einen','einem','einer','eines']);
const additionalVerbs:Record<string,[string,string]>={wohne:['живу','живу'],wohnst:['живёшь','живеш'],kommt:['приходит / приезжает','приходить / приїжджає'],kommst:['приходишь','приходиш'],kommen:['приходить','приходити'],helfe:['помогаю','допомагаю'],sehe:['вижу','бачу'],lege:['кладу','кладу'],liegt:['лежит','лежить'],stehe:['встаю (с auf)','встаю (з auf)'],rufe:['звоню (с an)','телефоную (з an)'],trinke:['пью','п’ю'],trinkst:['пьёшь','п’єш'],trinkt:['пьёт / пьёте','п’є / п’єте'],trinken:['пить / пьём / пьют','пити / п’ємо / п’ють'],kaufe:['покупаю','купую'],kaufst:['покупаешь','купуєш'],kauft:['покупает / покупаете','купує / купуєте'],kaufen:['покупать / покупаем / покупают','купувати / купуємо / купують'],koche:['готовлю','готую'],kochst:['готовишь','готуєш'],kocht:['готовит / готовите','готує / готуєте'],kochen:['готовить / готовим / готовят','готувати / готуємо / готують'],spiele:['играю','граю'],spielst:['играешь','граєш'],spielt:['играет / играете','грає / граєте'],spielen:['играть / играем / играют','грати / граємо / грають']};
export function sentenceGlosses(german:string,locale:'ru'|'uk'='ru'):WordGloss[]{
 const tokens=german.replace(/[.,?!;:«»"„“]/g,'').trim().split(/\s+/);const lower=tokens.map(t=>t.toLocaleLowerCase('de-DE'));
 const perfect=lower.some(w=>['gearbeitet','gelernt','gelesen','getrunken','gegessen','gekauft','gespielt','gekocht','gegangen'].includes(w));
 return tokens.map((word,index)=>{
  const key=lower[index];const entry=lexicon.get(key);const pick=(ru:string,uk:string)=>locale==='uk'?uk:ru;
  if((key==='auf'&&lower.includes('stehe')||key==='an'&&lower.includes('rufe')||key==='ein'&&lower.includes('kaufen'))&&index===tokens.length-1){const infinitive=key==='auf'?'aufstehen':key==='an'?'anrufen':'einkaufen';return {word,translation:pick('отделяемая приставка','відокремлюваний префікс'),note:pick(`Вместе с глаголом: ${infinitive}. Отдельно не переводится.`,`Разом із дієсловом: ${infinitive}. Окремо не перекладається.`),known:true};}
  if(perfect&&['habe','hast','hat','haben','habt','bin','bist','ist','sind','seid'].includes(key))return {word,translation:pick('вспомогательный глагол Perfekt','допоміжне дієслово Perfekt'),note:pick('Показывает лицо и время; обычно отдельно не переводится.','Указує особу й час; зазвичай окремо не перекладається.'),known:true};
  if(key==='das'&&lower[index+1]==='ist')return {word,translation:pick('это','це'),note:pick('Здесь das — указательное местоимение.','Тут das — вказівний займенник.'),known:true};
  if(articles.has(key))return {word,translation:pick(key.startsWith('ein')?'неопределённый артикль':'определённый артикль',key.startsWith('ein')?'неозначений артикль':'означений артикль'),note:pick('Артикль показывает грамматическую форму существительного; обычно не переводится отдельным словом.','Артикль указує граматичну форму іменника; зазвичай не перекладається окремим словом.'),known:true};
  if(entry)return {word,translation:entry[locale],known:true};
  const extra=additionalVerbs[key];if(extra)return {word,translation:extra[locale==='uk'?1:0],known:true};
  const verb=verbs.find(v=>v.forms.includes(key));
  if(verb){
   const people:Record<string,number>={ich:0,du:1,er:2,sie:2,es:2,wir:3,ihr:4};
   const subject=lower[index+1] in people?lower[index+1]:[...lower.slice(0,index)].reverse().find(w=>w in people);
   const candidate=subject?people[subject]:-1;const formIndex=candidate>=0&&verb.forms[candidate]===key?candidate:verb.forms.indexOf(key);
   const meaning=verb.id==='lernen'?['учу / учусь','учишь / учишься','учит / учится','учим / учимся','учите / учитесь','учат / учатся'][formIndex]:verb.translations[formIndex];
   return {word,translation:meaning,note:pick(`Форма глагола ${verb.id} — ${verb.meaning}.`,`Форма дієслова ${verb.id}. Значення російською: ${verb.meaning}.`),known:true};
  }
  return {word,translation:pick('Нет проверенного перевода в словаре разбора','Немає перевіреного перекладу в словнику розбору'),known:false};
 });
}
