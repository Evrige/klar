import data from './expandedVocabulary.json' with {type:'json'};
import type {Word} from './vocabulary.ts';

export const expandedVocabulary: Word[] = data as Word[];
