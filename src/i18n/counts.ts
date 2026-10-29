export function dayWord(count:number,locale:'ru'|'uk'){
 const category=new Intl.PluralRules(locale).select(count);
 const forms=locale==='uk'?{one:'день',few:'дні',many:'днів',other:'дня'}:{one:'день',few:'дня',many:'дней',other:'дня'};
 return forms[category as keyof typeof forms]??forms.other;
}
