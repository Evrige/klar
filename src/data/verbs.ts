import {extraVerbs} from './extraVerbs.ts';
export type Level = 'A1' | 'A2' | 'B1';
export type Verb = { id:string; meaning:string; group:'Слабые'|'Сильные'|'Модальные'|'Неправильные'; level:Level; forms:string[]; translations:string[]; stem:string; rule:string; example:string; translation:string };
export const pronouns=['ich','du','er / sie / es','wir','ihr','sie / Sie'];
export const people=['я','ты','он / она / оно','мы','вы (неформально)','они / Вы (вежливо)'];
function verb(id:string,meaning:string,group:Verb['group'],level:Level,forms:string,translations:string,stem:string,rule:string,example:string,translation:string):Verb{return {id,meaning,group,level,forms:forms.split(','),translations:translations.split(','),stem,rule,example,translation};}
export const verbs:Verb[]=[
verb('machen','делать','Слабые','A1','mache,machst,macht,machen,macht,machen','делаю,делаешь,делает,делаем,делаете,делают / делаете','mach','Уберите -en: machen → mach-. Добавьте окончания -e, -st, -t, -en, -t, -en. Основа не меняется.','Ich mache jeden Tag meine Hausaufgaben.','Я каждый день делаю домашнее задание.'),
verb('lernen','учить • учиться','Слабые','A1','lerne,lernst,lernt,lernen,lernt,lernen','учусь,учишься,учится,учимся,учитесь,учатся / учитесь','lern','Обычный слабый глагол: основа lern- остаётся одинаковой во всех лицах.','Wir lernen zusammen Deutsch.','Мы вместе учим немецкий.'),
verb('arbeiten','работать','Слабые','A1','arbeite,arbeitest,arbeitet,arbeiten,arbeitet,arbeiten','работаю,работаешь,работает,работаем,работаете,работают / работаете','arbeit','После основы на -t добавляется e перед окончаниями -st и -t: du arbeitest, er arbeitet, ihr arbeitet. Так слово легче произнести.','Sie arbeitet heute zu Hause.','Она сегодня работает дома.'),
verb('heißen','называться','Сильные','A1','heiße,heißt,heißt,heißen,heißt,heißen','называюсь,называешься,называется,называемся,называетесь,называются / называетесь','heiß','После ß окончание du — только -t вместо -st: du heißt. По типу спряжения heißen — сильный глагол, но в Präsens основа не меняется.','Wie heißt du?','Как тебя зовут?'),
verb('sein','быть','Неправильные','A1','bin,bist,ist,sind,seid,sind','есть,есть,есть,есть,есть,есть','', 'Формы sein нужно запомнить целиком. В немецком «быть» обязательно: Ich bin Student — «Я студент». В русском переводе «есть» обычно опускается.','Ich bin heute sehr glücklich.','Я сегодня очень счастлив.'),
verb('haben','иметь','Неправильные','A1','habe,hast,hat,haben,habt,haben','имею,имеешь,имеет,имеем,имеете,имеют / имеете','hab','В du и er/sie/es выпадает b: du hast, er hat. Haben часто переводится «у кого-то есть».','Wir haben heute Zeit.','У нас сегодня есть время.'),
verb('werden','становиться','Неправильные','A2','werde,wirst,wird,werden,werdet,werden','становлюсь,становишься,становится,становимся,становитесь,становятся / становитесь','werd','Особые формы: du wirst, er wird. Как самостоятельный глагол означает «становиться»; также помогает образовать Futur I и пассив.','Es wird langsam kalt.','Постепенно становится холодно.'),
verb('sprechen','говорить','Сильные','A1','spreche,sprichst,spricht,sprechen,sprecht,sprechen','говорю,говоришь,говорит,говорим,говорите,говорят / говорите','sprech','В du и er/sie/es гласная e меняется на i: sprichst, spricht. Во множественном числе возвращается e.','Sprichst du Deutsch?','Ты говоришь по-немецки?'),
verb('lesen','читать','Сильные','A1','lese,liest,liest,lesen,lest,lesen','читаю,читаешь,читает,читаем,читаете,читают / читаете','les','В du и er/sie/es: e → ie. Формы du liest и er liest совпадают.','Er liest ein interessantes Buch.','Он читает интересную книгу.'),
verb('fahren','ехать','Сильные','A1','fahre,fährst,fährt,fahren,fahrt,fahren','еду,едешь,едет,едем,едете,едут / едете','fahr','В du и er/sie/es: a → ä. Во всех остальных лицах основа fahr- сохраняется.','Wir fahren morgen nach Berlin.','Мы завтра едем в Берлин.'),
verb('nehmen','брать','Сильные','A2','nehme,nimmst,nimmt,nehmen,nehmt,nehmen','беру,берёшь,берёт,берём,берёте,берут / берёте','nehm','Особая основа nimm- в du и er/sie/es: nimmst, nimmt. В остальных формах — nehm-.','Ich nehme einen Kaffee.','Я возьму кофе.'),
verb('essen','есть • кушать','Сильные','A1','esse,isst,isst,essen,esst,essen','ем,ешь,ест,едим,едите,едят / едите','ess','В du и er/sie/es: e → i. Обе формы пишутся isst, с двойной s.','Was isst du gern?','Что ты любишь есть?'),
verb('können','мочь • уметь','Модальные','A1','kann,kannst,kann,können,könnt,können','могу,можешь,может,можем,можете,могут / можете','könn','В единственном числе ö → a. У ich и er/sie/es нет окончания, формы совпадают. Второй глагол стоит в конце в инфинитиве.','Ich kann gut schwimmen.','Я умею хорошо плавать.'),
verb('müssen','быть должным','Модальные','A1','muss,musst,muss,müssen,müsst,müssen','должен,должен,должен,должны,должны,должны','müss','В единственном числе ü → u. Nicht müssen означает «не нужно», а не «нельзя»: Du musst nicht kommen.','Ich muss heute arbeiten.','Я должен сегодня работать.'),
verb('wollen','хотеть','Модальные','A1','will,willst,will,wollen,wollt,wollen','хочу,хочешь,хочет,хотим,хотите,хотят / хотите','woll','В единственном числе o → i. Ich will — «я хочу». Не путайте с английским will.','Wir wollen Deutsch lernen.','Мы хотим учить немецкий.'),
verb('dürfen','иметь разрешение','Модальные','A2','darf,darfst,darf,dürfen,dürft,dürfen','могу,можешь,может,можем,можете,могут / можете','dürf','В единственном числе ü → a. Dürfen выражает разрешение; nicht dürfen — запрет («нельзя»).','Darf ich hier sitzen?','Можно мне здесь сесть?'),
verb('sollen','следует • должен','Модальные','A2','soll,sollst,soll,sollen,sollt,sollen','должен,должен,должен,должны,должны,должны','soll','Основа не меняется. Sollen передаёт чужое поручение, совет или ожидание. Ich и er/sie/es совпадают.','Du sollst mehr Wasser trinken.','Тебе следует пить больше воды.'),
verb('mögen','нравиться • любить','Модальные','A1','mag,magst,mag,mögen,mögt,mögen','люблю,любишь,любит,любим,любите,любят / любите','mög','В единственном числе основа mag-. Möchte — вежливое «хотел бы», форма Konjunktiv II от mögen, а не отдельный инфинитив.','Ich mag Musik.','Я люблю музыку.'),
verb('wissen','знать (факт)','Неправильные','B1','weiß,weißt,weiß,wissen,wisst,wissen','знаю,знаешь,знает,знаем,знаете,знают / знаете','wiss','В единственном числе основа weiß-. Ich и er/sie/es совпадают. Wissen — знать факт; kennen — быть знакомым с человеком или местом.','Ich weiß, dass du recht hast.','Я знаю, что ты прав.'),
...extraVerbs
];
export function splitForm(v:Verb,index:number){
 const form=v.forms[index];if(v.id==='sein')return {stem:form,ending:'',changed:true};
 const endings=v.group==='Модальные'||v.id==='wissen'?['','st','','en','t','en']:['e','st','t','en','t','en'];
 let ending=endings[index];
 if(index===1&&/[sßzx]$/.test(v.stem))ending='t';
 if(v.id==='lesen'&&index===1)ending='t';
 if(v.id==='werden'&&index===2)ending='';
 if(form.startsWith(v.stem)&&['','e','st','t','en','n','est','et'].includes(form.slice(v.stem.length)))ending=form.slice(v.stem.length);
 const stem=ending?form.slice(0,-ending.length):form;
 return {stem,ending,changed:stem!==v.stem};
}
