import type {Verb} from './verbs';
// Klar learning order. Levels describe this programme, not exclusive CEFR ownership.
// Each row: infinitive | level | group | six Russian forms | example | translation | exceptional present forms | explanation.
const rows=`
wohnen|A1|Слабые|живу,живёшь,живёт,живём,живёте,живут / живёте|Ich wohne in Berlin.|Я живу в Берлине.
kommen|A1|Сильные|прихожу,приходишь,приходит,приходим,приходите,приходят / приходите|Wir kommen heute.|Мы придём сегодня.
gehen|A1|Сильные|иду,идёшь,идёт,идём,идёте,идут / идёте|Ich gehe nach Hause.|Я иду домой.
hören|A1|Слабые|слушаю,слушаешь,слушает,слушаем,слушаете,слушают / слушаете|Sie hört Musik.|Она слушает музыку.
schreiben|A1|Сильные|пишу,пишешь,пишет,пишем,пишете,пишут / пишете|Ich schreibe einen Brief.|Я пишу письмо.
spielen|A1|Слабые|играю,играешь,играет,играем,играете,играют / играете|Wir spielen Fußball.|Мы играем в футбол.
kaufen|A1|Слабые|покупаю,покупаешь,покупает,покупаем,покупаете,покупают / покупаете|Du kaufst ein Buch.|Ты покупаешь книгу.
trinken|A1|Сильные|пью,пьёшь,пьёт,пьём,пьёте,пьют / пьёте|Er trinkt Wasser.|Он пьёт воду.
kochen|A1|Слабые|готовлю,готовишь,готовит,готовим,готовите,готовят / готовите|Ich koche eine Suppe.|Я готовлю суп.
suchen|A1|Слабые|ищу,ищешь,ищет,ищем,ищете,ищут / ищете|Wir suchen den Bahnhof.|Мы ищем вокзал.
finden|A1|Сильные|нахожу,находишь,находит,находим,находите,находят / находите|Ich finde den Schlüssel.|Я нахожу ключ.
sehen|A1|Сильные|вижу,видишь,видит,видим,видите,видят / видите|Sie sieht den Bus.|Она видит автобус.|sehe,siehst,sieht,sehen,seht,sehen|В du и er/sie/es: e → ie. Запомните du siehst и er sieht; ihr seht сохраняет e.
leben|A1|Слабые|живу,живёшь,живёт,живём,живёте,живут / живёте|Wir leben in Deutschland.|Мы живём в Германии.
brauchen|A1|Слабые|нуждаюсь,нуждаешься,нуждается,нуждаемся,нуждаетесь,нуждаются / нуждаетесь|Ich brauche Hilfe.|Мне нужна помощь.
fragen|A1|Слабые|спрашиваю,спрашиваешь,спрашивает,спрашиваем,спрашиваете,спрашивают / спрашиваете|Du fragst den Lehrer.|Ты спрашиваешь учителя.
antworten|A1|Слабые|отвечаю,отвечаешь,отвечает,отвечаем,отвечаете,отвечают / отвечаете|Ich antworte dem Lehrer.|Я отвечаю учителю.
kosten|A1|Слабые|стою,стоишь,стоит,стоим,стоите,стоят / стоите|Das Brot kostet drei Euro.|Хлеб стоит три евро.
lieben|A1|Слабые|люблю,любишь,любит,любим,любите,любят / любите|Ich liebe Musik.|Я люблю музыку.
reisen|A1|Слабые|путешествую,путешествуешь,путешествует,путешествуем,путешествуете,путешествуют / путешествуете|Wir reisen gern.|Мы любим путешествовать.
helfen|A2|Сильные|помогаю,помогаешь,помогает,помогаем,помогаете,помогают / помогаете|Du hilfst deinem Bruder.|Ты помогаешь своему брату.|helfe,hilfst,hilft,helfen,helft,helfen|В du и er/sie/es: e → i. Helfen требует Dativ: jemandem helfen.
geben|A2|Сильные|даю,даёшь,даёт,даём,даёте,дают / даёте|Er gibt mir das Buch.|Он даёт мне книгу.|gebe,gibst,gibt,geben,gebt,geben|В du и er/sie/es: e → i. Кому даём — Dativ; что даём — Akkusativ.
schlafen|A2|Сильные|сплю,спишь,спит,спим,спите,спят / спите|Das Kind schläft.|Ребёнок спит.|schlafe,schläfst,schläft,schlafen,schlaft,schlafen|В du и er/sie/es: a → ä. Во множественном числе основа schlaf-.
laufen|A2|Сильные|бегу,бежишь,бежит,бежим,бежите,бегут / бежите|Er läuft im Park.|Он бегает в парке.|laufe,läufst,läuft,laufen,lauft,laufen|В du и er/sie/es: au → äu. Личные окончания обычные.
treffen|A2|Сильные|встречаю,встречаешь,встречает,встречаем,встречаете,встречают / встречаете|Ich treffe einen Freund.|Я встречаю друга.|treffe,triffst,trifft,treffen,trefft,treffen|В du и er/sie/es: e → i. Treffen без sich может означать «встретить кого-то».
tragen|A2|Сильные|ношу,носишь,носит,носим,носите,носят / носите|Sie trägt eine Tasche.|Она несёт сумку.|trage,trägst,trägt,tragen,tragt,tragen|В du и er/sie/es: a → ä. Tragen — носить одежду или нести предмет.
halten|A2|Сильные|держу,держишь,держит,держим,держите,держат / держите|Du hältst das Glas.|Ты держишь стакан.|halte,hältst,hält,halten,haltet,halten|В du и er/sie/es: a → ä. Du hältst и er hält без дополнительного e; ihr haltet с e.
bringen|A2|Неправильные|приношу,приносишь,приносит,приносим,приносите,приносят / приносите|Ich bringe das Essen.|Я приношу еду.||В Präsens основа bring- не меняется. Это смешанный глагол: неправильность видна в прошлом — brachte, gebracht.
denken|A2|Неправильные|думаю,думаешь,думает,думаем,думаете,думают / думаете|Ich denke an dich.|Я думаю о тебе.||В Präsens обычные окончания. Denken an + Akkusativ — думать о ком-то. Смешанные формы прошлого: dachte, gedacht.
kennen|A2|Неправильные|знаю,знаешь,знает,знаем,знаете,знают / знаете|Wir kennen diese Stadt.|Мы знаем этот город.||Kennen — быть знакомым с человеком или местом. Präsens регулярный; смешанные формы прошлого — kannte, gekannt.
verstehen|A2|Сильные|понимаю,понимаешь,понимает,понимаем,понимаете,понимают / понимаете|Ich verstehe die Frage.|Я понимаю вопрос.
erklären|A2|Слабые|объясняю,объясняешь,объясняет,объясняем,объясняете,объясняют / объясняете|Sie erklärt die Regel.|Она объясняет правило.
besuchen|A2|Слабые|посещаю,посещаешь,посещает,посещаем,посещаете,посещают / посещаете|Wir besuchen unsere Freunde.|Мы навещаем наших друзей.
bezahlen|A2|Слабые|оплачиваю,оплачиваешь,оплачивает,оплачиваем,оплачиваете,оплачивают / оплачиваете|Ich bezahle die Rechnung.|Я оплачиваю счёт.
erzählen|A2|Слабые|рассказываю,рассказываешь,рассказывает,рассказываем,рассказываете,рассказывают / рассказываете|Du erzählst eine Geschichte.|Ты рассказываешь историю.
warten|A2|Слабые|жду,ждёшь,ждёт,ждём,ждёте,ждут / ждёте|Ich warte auf den Bus.|Я жду автобус.
öffnen|A2|Слабые|открываю,открываешь,открывает,открываем,открываете,открывают / открываете|Du öffnest das Fenster.|Ты открываешь окно.|öffne,öffnest,öffnet,öffnen,öffnet,öffnen|После основы öffn- нужен дополнительный e: du öffnest, er öffnet, ihr öffnet.
entscheiden|B1|Сильные|решаю,решаешь,решает,решаем,решаете,решают / решаете|Das Gericht entscheidet den Fall.|Суд решает дело.
empfehlen|B1|Сильные|рекомендую,рекомендуешь,рекомендует,рекомендуем,рекомендуете,рекомендуют / рекомендуете|Sie empfiehlt dieses Buch.|Она рекомендует эту книгу.|empfehle,empfiehlst,empfiehlt,empfehlen,empfehlt,empfehlen|В du и er/sie/es: e → ie. Приставка emp- не отделяется.
vergessen|B1|Сильные|забываю,забываешь,забывает,забываем,забываете,забывают / забываете|Er vergisst oft den Schlüssel.|Он часто забывает ключ.|vergesse,vergisst,vergisst,vergessen,vergesst,vergessen|В du и er/sie/es: e → i. После ss окончание du только -t, поэтому du vergisst и er vergisst совпадают.
verlieren|B1|Сильные|теряю,теряешь,теряет,теряем,теряете,теряют / теряете|Ich verliere manchmal die Geduld.|Я иногда теряю терпение.
gewinnen|B1|Сильные|выигрываю,выигрываешь,выигрывает,выигрываем,выигрываете,выигрывают / выигрываете|Unsere Mannschaft gewinnt das Spiel.|Наша команда выигрывает матч.
vergleichen|B1|Сильные|сравниваю,сравниваешь,сравнивает,сравниваем,сравниваете,сравнивают / сравниваете|Wir vergleichen die Preise.|Мы сравниваем цены.
erkennen|B1|Неправильные|узнаю,узнаёшь,узнаёт,узнаём,узнаёте,узнают / узнаёте|Ich erkenne das Problem.|Я распознаю проблему.||В Präsens обычные окончания. Erkennen может означать «узнать по признакам» или «осознать». В прошлом: erkannte, erkannt.
versprechen|B1|Сильные|обещаю,обещаешь,обещает,обещаем,обещаете,обещают / обещаете|Du versprichst mir Hilfe.|Ты обещаешь мне помощь.|verspreche,versprichst,verspricht,versprechen,versprecht,versprechen|В du и er/sie/es: e → i, как у sprechen. Неотделяемая приставка ver- сохраняется в начале.
erreichen|B1|Слабые|достигаю,достигаешь,достигает,достигаем,достигаете,достигают / достигаете|Wir erreichen unser Ziel.|Мы достигаем своей цели.
vermeiden|B1|Сильные|избегаю,избегаешь,избегает,избегаем,избегаете,избегают / избегаете|Ich vermeide unnötigen Stress.|Я избегаю ненужного стресса.
ermöglichen|B1|Слабые|делаю возможным,делаешь возможным,делает возможным,делаем возможным,делаете возможным,делают возможным / делаете возможным|Das Internet ermöglicht neue Kontakte.|Интернет делает возможными новые знакомства.
erwarten|B1|Слабые|ожидаю,ожидаешь,ожидает,ожидаем,ожидаете,ожидают / ожидаете|Wir erwarten eine Antwort.|Мы ожидаем ответ.
verbessern|B1|Слабые|улучшаю,улучшаешь,улучшает,улучшаем,улучшаете,улучшают / улучшаете|Ich verbessere mein Deutsch.|Я улучшаю свой немецкий.|verbessere,verbesserst,verbessert,verbessern,verbessert,verbessern|У глаголов на -ern инфинитив оканчивается на -n: основа verbesser-. Ich verbessere; wir и sie verbessern.
berichten|B1|Слабые|сообщаю,сообщаешь,сообщает,сообщаем,сообщаете,сообщают / сообщаете|Sie berichtet über ihre Reise.|Она рассказывает о своей поездке.
unterstützen|B1|Слабые|поддерживаю,поддерживаешь,поддерживает,поддерживаем,поддерживаете,поддерживают / поддерживаете|Wir unterstützen unsere Freunde.|Мы поддерживаем своих друзей.
überzeugen|B1|Слабые|убеждаю,убеждаешь,убеждает,убеждаем,убеждаете,убеждают / убеждаете|Dein Vorschlag überzeugt mich.|Твоё предложение меня убеждает.
`;
const meanings:Record<string,string>={wohnen:'жить (проживать)',kommen:'приходить • приезжать',gehen:'идти',hören:'слушать • слышать',schreiben:'писать',spielen:'играть',kaufen:'покупать',trinken:'пить',kochen:'готовить',suchen:'искать',finden:'находить',sehen:'видеть',leben:'жить',brauchen:'нуждаться • быть нужным',fragen:'спрашивать',antworten:'отвечать',kosten:'стоить',lieben:'любить',reisen:'путешествовать',helfen:'помогать',geben:'давать',schlafen:'спать',laufen:'бегать',treffen:'встречать',tragen:'носить • нести',halten:'держать',bringen:'приносить',denken:'думать',kennen:'знать • быть знакомым',verstehen:'понимать',erklären:'объяснять',besuchen:'посещать • навещать',bezahlen:'оплачивать',erzählen:'рассказывать',warten:'ждать',öffnen:'открывать',entscheiden:'решать',empfehlen:'рекомендовать',vergessen:'забывать',verlieren:'терять',gewinnen:'выигрывать',vergleichen:'сравнивать',erkennen:'узнавать • распознавать',versprechen:'обещать',erreichen:'достигать',vermeiden:'избегать',ermöglichen:'делать возможным',erwarten:'ожидать',verbessern:'улучшать',berichten:'сообщать • рассказывать',unterstützen:'поддерживать',überzeugen:'убеждать'};
export const extraVerbs:Verb[]=[...new Map(rows.trim().split('\n').map(row=>{
 const [id,level,group,translations,example,translation,override,explanation]=row.split('|');
 const stem=id.endsWith('ern')?id.slice(0,-1):id.slice(0,-2);const e=/[td]$/.test(stem)||id==='finden';const sibilant=/[sßzx]$/.test(stem);
 const forms=override?override.split(','):[stem+'e',stem+(e?'est':sibilant?'t':'st'),stem+(e?'et':'t'),id,stem+(e?'et':'t'),id];
 const rule=explanation||(e?'В Präsens добавляется e перед -st и -t: так основу легче произнести.':sibilant?'После s, ß, z или x окончание du — только -t вместо -st.':group==='Сильные'?'В Präsens основа не меняется; личные окончания обычные. Сильное спряжение проявляется в формах прошлого времени.':'В Präsens основа не меняется. Добавьте окончания -e, -st, -t, -en, -t, -en.');
 return [id,{id,meaning:meanings[id],level:level as Verb['level'],group:group as Verb['group'],stem,forms,translations:translations.split(','),rule,example,translation}] as const;
})).values()];
