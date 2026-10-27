import {buildSentenceBank} from './sentenceBank.ts';
export type Sentence={id:string;german:string;translation:string;hint:string;explanation:string;alternatives?:string[];topic?:string};
const originalSentences:Sentence[]=[
 {id:'learn',german:'Ich lerne heute Deutsch.',translation:'Я сегодня учу немецкий.',hint:'Утверждение: спрягаемый глагол на второй позиции.',explanation:'Lerne стоит на второй позиции. Можно начать с heute — тогда ich идёт после глагола.',alternatives:['Heute lerne ich Deutsch']},
 {id:'inversion',german:'Morgen fahre ich nach Berlin.',translation:'Завтра я еду в Берлин.',hint:'Начните с Morgen.',explanation:'Morgen занимает первую позицию, fahre — вторую, затем подлежащее ich.'},
 {id:'time',german:'Wir haben heute Zeit.',translation:'У нас сегодня есть время.',hint:'Начните с Wir.',explanation:'Wir — подлежащее, haben — глагол на второй позиции.'},
 {id:'coffee',german:'Ich trinke gern Kaffee.',translation:'Я люблю пить кофе.',hint:'Начните с Ich.',explanation:'Trinke — спрягаемый глагол. Gern после глагола показывает, что действие нравится.'},
 {id:'home',german:'Sie arbeitet zu Hause.',translation:'Она работает дома.',hint:'Начните с Sie.',explanation:'Arbeitet на второй позиции. Zu Hause — устойчивое выражение «дома».'},
 {id:'question',german:'Lernst du Deutsch?',translation:'Ты учишь немецкий?',hint:'Вопрос без вопросительного слова.',explanation:'В вопросе да/нет спрягаемый глагол lernst стоит на первом месте.'},
 {id:'where',german:'Wo wohnst du?',translation:'Где ты живёшь?',hint:'Начните с вопросительного слова.',explanation:'Wo — первая позиция, wohnst — вторая, du — подлежащее после глагола.'},
 {id:'when',german:'Wann kommt der Bus?',translation:'Когда приходит автобус?',hint:'Начните с Wann.',explanation:'Wann занимает первую позицию, kommt — вторую. Der Bus вместе образуют подлежащее.'},
 {id:'how',german:'Wie heißt deine Schwester?',translation:'Как зовут твою сестру?',hint:'Начните с Wie.',explanation:'В вопросе с Wie глагол heißt остаётся на второй позиции.'},
 {id:'can',german:'Ich kann gut schwimmen.',translation:'Я умею хорошо плавать.',hint:'Начните с Ich. Инфинитив поставьте в конец.',explanation:'Kann спрягается и стоит на второй позиции, schwimmen в инфинитиве — в конце.'},
 {id:'must',german:'Du musst heute arbeiten.',translation:'Ты должен сегодня работать.',hint:'Начните с Du. Инфинитив — в конце.',explanation:'Модальный musst стоит на второй позиции, arbeiten — в конце предложения.'},
 {id:'want',german:'Wir wollen Deutsch lernen.',translation:'Мы хотим учить немецкий.',hint:'Начните с Wir.',explanation:'Wollen занимает вторую позицию. Смысловой глагол lernen не спрягается и идёт в конец.'},
 {id:'permission',german:'Darf ich hier sitzen?',translation:'Можно мне здесь сесть?',hint:'Вопрос с модальным глаголом без вопросительного слова.',explanation:'Darf на первом месте, ich после него. Инфинитив sitzen замыкает предложение.'},
 {id:'separable',german:'Ich stehe um sieben Uhr auf.',translation:'Я встаю в семь часов.',hint:'Начните с Ich. Приставка auf идёт в конец.',explanation:'У aufstehen приставка отделяется: stehe на второй позиции, auf — в конце.'},
 {id:'shopping',german:'Wir kaufen heute ein.',translation:'Мы сегодня делаем покупки.',hint:'Начните с Wir.',explanation:'Einkaufen — отделяемый глагол: kaufen занимает вторую позицию, ein идёт в конец.'},
 {id:'call',german:'Ich rufe dich morgen an.',translation:'Я позвоню тебе завтра.',hint:'Начните с Ich.',explanation:'У anrufen отделяется an. Dich — дополнение в Akkusativ, morgen — время.'},
 {id:'negation',german:'Ich habe kein Auto.',translation:'У меня нет машины.',hint:'Начните с Ich.',explanation:'Для отрицания существительного с ein или без артикля используем kein: kein Auto.'},
 {id:'not',german:'Das ist nicht teuer.',translation:'Это не дорого.',hint:'Начните с Das.',explanation:'Nicht стоит перед отрицаемым прилагательным teuer.'},
 {id:'cannot',german:'Ich kann heute nicht kommen.',translation:'Я не могу сегодня прийти.',hint:'Начните с Ich. Nicht — перед инфинитивом.',explanation:'Kann на второй позиции. Nicht отрицает действие kommen, инфинитив в конце.'},
 {id:'because',german:'Ich lerne Deutsch, weil ich in Berlin wohne.',translation:'Я учу немецкий, потому что живу в Берлине.',hint:'Начните с Ich lerne Deutsch. В части с weil глагол — в конце.',explanation:'Weil вводит придаточное. Его спрягаемый глагол wohne ставится в конец.'},
 {id:'that',german:'Ich weiß, dass du heute kommst.',translation:'Я знаю, что ты сегодня придёшь.',hint:'Начните с Ich weiß. После dass глагол — в конце.',explanation:'В главном предложении weiß на второй позиции; в придаточном после dass kommst стоит в конце.'},
 {id:'conditional',german:'Wenn ich Zeit habe, lerne ich Deutsch.',translation:'Когда у меня есть время, я учу немецкий.',hint:'Начните с Wenn.',explanation:'Придаточное Wenn ich Zeit habe занимает первую позицию всего предложения. Поэтому главное начинается с lerne.'},
 {id:'perfect',german:'Ich habe gestern Deutsch gelernt.',translation:'Я вчера учил немецкий.',hint:'Начните с Ich. Partizip II — в конце.',explanation:'Perfekt: habe — спрягаемый помощник на второй позиции, gelernt — Partizip II в конце.'},
 {id:'went',german:'Wir sind nach Hause gegangen.',translation:'Мы пошли домой.',hint:'Начните с Wir.',explanation:'Gehen образует Perfekt с sein: sind на второй позиции, gegangen в конце.'},
 {id:'bought',german:'Sie hat ein Buch gekauft.',translation:'Она купила книгу.',hint:'Начните с Sie.',explanation:'Perfekt с haben: hat — на второй позиции, gekauft — в конце.'},
 {id:'dative',german:'Ich helfe meinem Bruder.',translation:'Я помогаю своему брату.',hint:'Начните с Ich.',explanation:'Helfen требует Dativ: meinem Bruder. Глагол helfe — на второй позиции.'},
 {id:'accusative',german:'Ich sehe den Mann.',translation:'Я вижу мужчину.',hint:'Начните с Ich.',explanation:'Sehen требует Akkusativ для прямого дополнения: der Mann → den Mann.'},
 {id:'location',german:'Das Buch liegt auf dem Tisch.',translation:'Книга лежит на столе.',hint:'Начните с Das Buch.',explanation:'Вопрос Wo? — где? После auf нужен Dativ: auf dem Tisch.'},
 {id:'direction',german:'Ich lege das Buch auf den Tisch.',translation:'Я кладу книгу на стол.',hint:'Начните с Ich.',explanation:'Вопрос Wohin? — куда? После auf нужен Akkusativ: auf den Tisch.'},
 {id:'therefore',german:'Deshalb lerne ich jeden Tag.',translation:'Поэтому я учусь каждый день.',hint:'Начните с Deshalb.',explanation:'Deshalb занимает первую позицию. Сразу после него идёт спрягаемый глагол lerne, затем ich.'}
];
export const sentences:Sentence[]=[...new Map([...originalSentences.map(s=>({...s,topic:s.topic??'Порядок слов и падежи'})),...buildSentenceBank()].reverse().map(s=>[s.german.toLocaleLowerCase('de-DE'),s])).values()];
export function sentenceTokens(sentence:Sentence){return sentence.german.replace(/[.,?!]/g,'').split(/\s+/).map((token,index)=>({id:index,text:index===0?token[0].toLocaleLowerCase('de-DE')+token.slice(1):token}));}
export function normalizeSentence(value:string){return value.normalize('NFC').toLocaleLowerCase('de-DE').replace(/[.,?!]/g,'').trim().replace(/\s+/g,' ');}
export function isCorrectSentence(sentence:Sentence,words:string[]){const actual=normalizeSentence(words.join(' '));return [sentence.german,...(sentence.alternatives??[])].some(s=>normalizeSentence(s)===actual);}
export function validSentenceProgress(v:unknown):v is string[]{return Array.isArray(v)&&v.every(k=>typeof k==='string'&&sentences.some(s=>s.id===k))&&new Set(v).size===v.length;}
