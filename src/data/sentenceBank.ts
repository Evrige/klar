import type {Sentence} from './sentences';
export const sentenceTopics=['Все темы','Повседневная речь','Вопросы да/нет','Вопросительные слова','Прошедшее время','Модальные глаголы','Порядок слов и падежи'] as const;
type Profile={id:string;forms:string[];ru:string[];participle:string;tails:[string,string][];question?:[string,string]};
const people=[['ich','я'],['du','ты'],['er','он'],['sie','она'],['wir','мы'],['ihr','вы']];
const times=[['heute','сегодня'],['jeden Tag','каждый день'],['am Abend','вечером'],['am Wochenende','на выходных']];
const profiles:Profile[]=[
 {id:'learn',forms:['lerne','lernst','lernt','lernt','lernen','lernt'],ru:['учу','учишь','учит','учит','учим','учите'],participle:'gelernt',question:['Was','Что'],tails:[['Deutsch','немецкий'],['Englisch','английский'],['neue Wörter','новые слова'],['die Grammatik','грамматику']]},
 {id:'read',forms:['lese','liest','liest','liest','lesen','lest'],ru:['читаю','читаешь','читает','читает','читаем','читаете'],participle:'gelesen',question:['Was','Что'],tails:[['ein Buch','книгу'],['die Zeitung','газету'],['eine Nachricht','сообщение'],['einen Brief','письмо']]},
 {id:'drink',forms:['trinke','trinkst','trinkt','trinkt','trinken','trinkt'],ru:['пью','пьёшь','пьёт','пьёт','пьём','пьёте'],participle:'getrunken',question:['Was','Что'],tails:[['Wasser','воду'],['Tee','чай'],['Kaffee','кофе'],['Saft','сок']]},
 {id:'eat',forms:['esse','isst','isst','isst','essen','esst'],ru:['ем','ешь','ест','ест','едим','едите'],participle:'gegessen',question:['Was','Что'],tails:[['Brot','хлеб'],['einen Apfel','яблоко'],['eine Suppe','суп'],['einen Salat','салат']]},
 {id:'buy',forms:['kaufe','kaufst','kauft','kauft','kaufen','kauft'],ru:['покупаю','покупаешь','покупает','покупает','покупаем','покупаете'],participle:'gekauft',question:['Was','Что'],tails:[['ein Ticket','билет'],['ein Buch','книгу'],['eine Fahrkarte','проездной билет'],['frisches Brot','свежий хлеб']]},
 {id:'play',forms:['spiele','spielst','spielt','spielt','spielen','spielt'],ru:['играю','играешь','играет','играет','играем','играете'],participle:'gespielt',tails:[['Fußball','в футбол'],['Tennis','в теннис'],['Basketball','в баскетбол'],['Gitarre','на гитаре']]},
 {id:'work',forms:['arbeite','arbeitest','arbeitet','arbeitet','arbeiten','arbeitet'],ru:['работаю','работаешь','работает','работает','работаем','работаете'],participle:'gearbeitet',tails:[['im Büro','в офисе'],['zu Hause','дома'],['in der Schule','в школе'],['im Krankenhaus','в больнице']]},
 {id:'cook',forms:['koche','kochst','kocht','kocht','kochen','kocht'],ru:['готовлю','готовишь','готовит','готовит','готовим','готовите'],participle:'gekocht',question:['Was','Что'],tails:[['eine Suppe','суп'],['das Abendessen','ужин'],['Reis','рис'],['Nudeln','макароны']]}
];
const capital=(text:string)=>text[0].toLocaleUpperCase('de-DE')+text.slice(1);
export type TaggedSentence=Sentence&{topic:string};
export function buildSentenceBank():TaggedSentence[]{
 const result:TaggedSentence[]=[];
 for(const profile of profiles)for(let person=0;person<people.length;person++){
  const [de,ru]=people[person];const form=profile.forms[person];
  for(let time=0;time<times.length;time++)for(let tail=0;tail<profile.tails.length;tail++){
   const [timeDe,timeRu]=times[time],[tailDe,tailRu]=profile.tails[tail];
   result.push({id:`bank-present-${profile.id}-${person}-${time}-${tail}`,topic:'Повседневная речь',german:`${capital(de)} ${form} ${timeDe} ${tailDe}.`,alternatives:[`${capital(timeDe)} ${form} ${de} ${tailDe}.`],translation:`${capital(ru)} ${timeRu} ${profile.ru[person]} ${tailRu}.`,hint:`Начните с ${capital(de)}. Схема: кто → глагол → время → остальное.`,explanation:`Спрягаемый глагол ${form} стоит на второй позиции. ${timeDe} — обстоятельство времени. В этом упражнении тренируем нейтральный порядок: подлежащее, глагол, время, дополнение или место.`});
   if([1,4,5].includes(person)&&time<2)result.push({id:`bank-yesno-${profile.id}-${person}-${time}-${tail}`,topic:'Вопросы да/нет',german:`${capital(form)} ${de} ${timeDe} ${tailDe}?`,translation:`${capital(ru)} ${timeRu} ${profile.ru[person]} ${tailRu}?`,hint:'Вопрос без вопросительного слова: начните со спрягаемого глагола.',explanation:`${capital(form)} занимает первую позицию, затем идёт подлежащее ${de}. Вопрос да/нет строится без вопросительного слова.`});
  }
  if(profile.question)for(let time=0;time<times.length;time++){
   const [question,questionRu]=profile.question,[timeDe,timeRu]=times[time];
   result.push({id:`bank-wh-${profile.id}-${person}-${time}`,topic:'Вопросительные слова',german:`${question} ${form} ${de} ${timeDe}?`,translation:`${questionRu} ${ru} ${timeRu} ${profile.ru[person]}?`,hint:`Начните с ${question}. После него — спрягаемый глагол.`,explanation:`${question} занимает первую позицию, ${form} — вторую, затем подлежащее ${de}. Время ${timeDe} идёт после подлежащего.`});
  }
 }
 const pastRu:Record<string,string[]>={learn:['учил','учил','учил','учила','учили','учили'],read:['читал','читал','читал','читала','читали','читали'],drink:['пил','пил','пил','пила','пили','пили'],eat:['ел','ел','ел','ела','ели','ели'],buy:['купил','купил','купил','купила','купили','купили'],play:['играл','играл','играл','играла','играли','играли'],work:['работал','работал','работал','работала','работали','работали'],cook:['готовил','готовил','готовил','готовила','готовили','готовили']};
 const haben=['habe','hast','hat','hat','haben','habt'];
 for(const profile of profiles)for(let person=0;person<people.length;person++)for(let tail=0;tail<profile.tails.length;tail++)for(const [timeId,timeDe,timeRu]of [['yesterday','gestern','вчера'],['lastweek','letzte Woche','на прошлой неделе']]){
  const [de,ru]=people[person],[tailDe,tailRu]=profile.tails[tail];
  result.push({id:`bank-perfect-${profile.id}-${person}-${tail}-${timeId}`,topic:'Прошедшее время',german:`${capital(de)} ${haben[person]} ${timeDe} ${tailDe} ${profile.participle}.`,alternatives:[`${capital(timeDe)} ${haben[person]} ${de} ${tailDe} ${profile.participle}.`],translation:`${capital(ru)} ${timeRu} ${pastRu[profile.id][person]} ${tailRu}.`,hint:`Начните с ${capital(de)}. Помощник haben — на второй позиции; Partizip II — в конце.`,explanation:`Perfekt образуется с ${haben[person]} и Partizip II ${profile.participle}. Время и дополнение или место располагаются внутри глагольной рамки. Русский род говорящего не меняет немецкую форму.`});
 }
 const modalSubjects=[{de:'ich',ru:'я',forms:['kann','muss','will'],verbs:['могу','должен','хочу']},{de:'du',ru:'ты',forms:['kannst','musst','willst'],verbs:['можешь','должен','хочешь']},{de:'wir',ru:'мы',forms:['können','müssen','wollen'],verbs:['можем','должны','хотим']}];
 const activities=[['Deutsch lernen','учить немецкий'],['nach Hause gehen','пойти домой'],['im Büro arbeiten','работать в офисе'],['eine Suppe kochen','приготовить суп'],['ein Buch lesen','почитать книгу'],['Fußball spielen','поиграть в футбол'],['einen Freund besuchen','навестить друга'],['eine Fahrkarte kaufen','купить проездной билет']];
 for(let p=0;p<modalSubjects.length;p++)for(let m=0;m<3;m++)for(let a=0;a<activities.length;a++){
  const subject=modalSubjects[p],[activityDe,activityRu]=activities[a];
  result.push({id:`bank-modal-${p}-${m}-${a}`,topic:'Модальные глаголы',german:`${capital(subject.de)} ${subject.forms[m]} heute ${activityDe}.`,alternatives:[`Heute ${subject.forms[m]} ${subject.de} ${activityDe}.`],translation:`${capital(subject.ru)} ${subject.verbs[m]} сегодня ${activityRu}.`,hint:`Начните с ${capital(subject.de)}. Смысловой глагол в инфинитиве поставьте в конец.`,explanation:`Модальный глагол ${subject.forms[m]} согласуется с подлежащим и стоит на второй позиции. Инфинитив ${activityDe.split(' ').at(-1)} замыкает предложение.`});
 }
 return result;
}
