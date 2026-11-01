import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstSteps,firstStepsSource,firstStepsCorrections,makeGuidePractice,guideTag} from '../src/data/firstSteps.ts';
import {guidePronunciation} from '../src/data/guidePronunciation.ts';
import {applyAttempt,emptyLearning,validLearning} from '../src/learning/model.ts';

test('first steps covers all instructional pages and retains source provenance',()=>{
    assert.equal(firstSteps.length,16);assert.equal(firstStepsSource.pages,21);
    assert.match(firstStepsSource.publisher,/EW-Verlag/);
    const covered=new Set(firstSteps.flatMap(section=>section.pages));for(let page=3;page<=21;page++)assert.ok(covered.has(page),`missing page ${page}`);
    const rows=firstSteps.flatMap(section=>section.rows);assert.ok(rows.length>250);assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
    for(const section of firstSteps){assert.ok(section.title.ru&&section.title.uk&&section.intro.ru&&section.intro.uk);for(const row of section.rows){assert.ok(row.german&&row.translation.ru&&row.translation.uk);assert.ok(![row.german,row.translation.ru,row.translation.uk].some(value=>value.includes('undefined')||value.includes('\uFFFD')));}}
    assert.ok(readFileSync('public/materials/first-steps-ukrainian.pdf').subarray(0,4).equals(Buffer.from('%PDF')));
});
test('alphabet labels use the selected language rather than leaking Ukrainian letters into Russian',()=>{
    const alphabet=firstSteps.find(section=>section.id==='alphabet');
    for(const row of alphabet.rows)assert.ok(!/[іїєґ]/i.test(guideTag(row,'alphabet','ru')));
    assert.equal(guideTag(alphabet.rows.find(row=>row.tag.startsWith('G ·')),'alphabet','ru'),'G · гэ');
    assert.equal(guideTag(alphabet.rows.find(row=>row.tag.startsWith('G ·')),'alphabet','uk'),'G · ґе');
});
test('every word and sentence has offline IPA and locale-specific approximate reading',()=>{
    for(const section of firstSteps)for(const row of section.rows){
        assert.ok(guidePronunciation(row,'ru',true).length>0,row.id);
        assert.ok(guidePronunciation(row,'ru').length>0,row.id);
        assert.ok(guidePronunciation(row,'uk').length>0,row.id);
        assert.ok(!/[іїєґ]/i.test(guidePronunciation(row,'ru')),row.id);
    }
});
test('all book sections have valid bilingual practice without ambiguous duplicate choices',()=>{
    for(const section of firstSteps)for(const locale of ['ru','uk']){
        const questions=makeGuidePractice(section,locale,()=>.4);assert.ok(questions.length>0&&questions.length<=10);
        assert.equal(new Set(questions.map(q=>q.row.id)).size,questions.length);
        for(const q of questions){assert.ok(!q.row.german.includes('…'));assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.equal(q.options.filter(value=>value===q.row.translation[locale]).length,1);}
    }
});
test('source corrections retain correct German for wellbeing and telling time',()=>{
    const rows=firstSteps.flatMap(section=>section.rows);
    assert.ok(rows.some(row=>row.german==='Es geht mir gut.'));
    assert.ok(!rows.some(row=>row.german.includes('Es geht mit gut')||row.german.includes('eine Uhr')));
    assert.equal(rows.find(row=>row.german==='Freut mich!').translation.uk,'Дуже приємно!');
    assert.ok(firstStepsCorrections.length>=8);
});
test('guide practice records real attempts in the existing learning journal without fake vocabulary IDs',()=>{
    const row=firstSteps[0].rows[0],attempt={key:`${row.id}:uk`,domain:'word',prompt:row.german,answers:[row.translation.uk],answer:'неправильно',correct:false,explanation:`${row.german} — ${row.translation.uk}`,audio:row.german};
    const state=applyAttempt(emptyLearning(),attempt,'guide-test',Date.now());assert.ok(validLearning(state));assert.equal(state.mistakes[attempt.key].prompt,row.german);assert.equal(Object.keys(state.skills).length,0);assert.equal(state.journal.days[state.days[0]].attempts,1);
});
