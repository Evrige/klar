import catalog from './firstStepsPronunciation.json' with {type:'json'};
import type {GuideRow} from './firstSteps';
type Entry={german:string;ipa:string;ru:string;uk:string};
export function guidePronunciation(row:GuideRow,locale:'ru'|'uk',ipa=false){
    const entry=(catalog.entries as Record<string,Entry>)[row.id];
    return entry?.german===row.german?(ipa?entry.ipa:entry[locale]):'';
}
