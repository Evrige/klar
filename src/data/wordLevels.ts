import examLevels from './vocabularyExamLevels.json' with {type:'json'};
import metadata from './vocabularyLevels.json' with {type:'json'};
import {expandedVocabulary} from './expandedVocabulary.ts';
const expandedLevels=new Map(expandedVocabulary.map(word=>[word.id,word.level]));
export const wordLevels=['A1','A2','B1','extra'] as const;
export type WordLevel=typeof wordLevels[number];
// Curated foundational items often appear in thematic groups rather than the
// alphabetic headword column of the PDF. These are Klar's study labels.
const starterWords=new Set('guten Morgen|guten Tag|guten Abend|gute Nacht|auf Wiedersehen|der Nachname|die Telefonnummer|Russisch|Englisch|Deutschland|Österreich|Frankreich|Italien|Spanien|Polen|Russland|Europa|Samstag|null|hundert|tausend|der Euro|der Cent|das Kilo|der Frühling|du|ihr|dein|unser|dieser|alle|wie viel|zweiundzwanzig|dreiundzwanzig|vierundzwanzig|fünfundzwanzig|sechsundzwanzig|siebenundzwanzig|achtundzwanzig|neunundzwanzig'.split('|'));
export function wordLevel(id:string):WordLevel{if (starterWords.has(id)) return 'A1';
    const prior = (metadata as Record<string,WordLevel>)[id] ?? expandedLevels.get(id);
    if (prior === 'A1') return prior;
    return (examLevels as Record<string,WordLevel>)[id] ?? prior ?? 'extra';}
export function validSelectedLevels(value:unknown):value is WordLevel[]{return Array.isArray(value)&&value.every(l=>wordLevels.includes(l))&&new Set(value).size===value.length;}
export const levelSources=[
 {level:'A1',url:'https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf'},
 {level:'A2',url:'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf'},
 {level:'B1',url:'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf'}
];
// Earliest headword match in the three local reference lists, not certification of
// every meaning or compound. Unmatched entries deliberately remain unclassified.
