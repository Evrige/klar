import type {Verb} from './verbs.ts';
const raw=`sein|war|ist gewesen
haben|hatte|hat gehabt
werden|wurde|ist geworden
heißen|hieß|hat geheißen
sprechen|sprach|hat gesprochen
lesen|las|hat gelesen
fahren|fuhr|ist gefahren
nehmen|nahm|hat genommen
essen|aß|hat gegessen
können|konnte|hat … können
müssen|musste|hat … müssen
wollen|wollte|hat … wollen
dürfen|durfte|hat … dürfen
sollen|sollte|hat … sollen
mögen|mochte|hat gemocht
wissen|wusste|hat gewusst
kommen|kam|ist gekommen
gehen|ging|ist gegangen
schreiben|schrieb|hat geschrieben
trinken|trank|hat getrunken
finden|fand|hat gefunden
sehen|sah|hat gesehen
helfen|half|hat geholfen
geben|gab|hat gegeben
schlafen|schlief|hat geschlafen
laufen|lief|ist gelaufen
treffen|traf|hat getroffen
tragen|trug|hat getragen
halten|hielt|hat gehalten
bringen|brachte|hat gebracht
denken|dachte|hat gedacht
kennen|kannte|hat gekannt
verstehen|verstand|hat verstanden
entscheiden|entschied|hat entschieden
empfehlen|empfahl|hat empfohlen
vergessen|vergaß|hat vergessen
verlieren|verlor|hat verloren
gewinnen|gewann|hat gewonnen
vergleichen|verglich|hat verglichen
erkennen|erkannte|hat erkannt
versprechen|versprach|hat versprochen
vermeiden|vermied|hat vermieden`;
const exceptions=new Map(raw.split('\n').map(row=>{const [id,past,perfect]=row.split('|');return [id,{past,perfect}] as const;}));
export function principalForms(verb:Verb){const special=exceptions.get(verb.id);if(special)return special;const e=/[td]$/.test(verb.stem)||verb.id==='öffnen';const prefix=/^(be|emp|ent|er|ge|miss|ver|zer)/.test(verb.id)||['überzeugen','unterstützen'].includes(verb.id);return {past:verb.stem+(e?'ete':'te'),perfect:'hat '+(prefix?'':'ge')+verb.stem+(e?'et':'t')};}
export const verbChunks:Record<string,string>={warten:'auf jemanden / etwas warten · Akkusativ',helfen:'jemandem helfen · Dativ',denken:'an jemanden / etwas denken · Akkusativ',sprechen:'mit jemandem sprechen · Dativ; über etwas sprechen · Akkusativ',geben:'jemandem etwas geben · Dativ + Akkusativ',antworten:'jemandem antworten · Dativ; auf eine Frage antworten · Akkusativ',fragen:'jemanden fragen · Akkusativ',erzählen:'jemandem etwas erzählen · Dativ + Akkusativ',berichten:'über etwas berichten · Akkusativ',überzeugen:'jemanden von etwas überzeugen · Akkusativ + von/Dativ'};
