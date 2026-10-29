import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementCards,validTrackAward} from '../src/data/achievementTracks.ts';
import {eligibleAchievements,validEarned} from '../src/data/achievements.ts';
const base={lessons:0,known:0,testedWords:0,verbs:0,sentences:0,streak:0};
const card=(days,earned={})=>achievementCards({...base,streak:days},earned).find(c=>c.id==='streak');
test('One card per category replaces duplicate milestone cards',()=>{
 const cards=achievementCards({...base,streak:100,testedWords:1000},{});assert.equal(cards.length,6);assert.equal(new Set(cards.map(c=>c.id)).size,6);
});
test('Activity badge evolves from silver at 10 to gold at 30 and diamond at 60',()=>{
 assert.equal(card(0).skin,'locked');assert.equal(card(3).skin,'bronze');assert.equal(card(10).skin,'silver');assert.equal(card(10).next,30);assert.equal(card(30).skin,'gold');assert.equal(card(30).next,60);assert.equal(card(60).skin,'diamond');assert.equal(card(100).rank,5);
 assert.equal(card(20).percent,50);
});
test('Earned upgrades survive a break and legacy milestone storage is retained',()=>{
 const earned={'streak-30':'2026-10-29T00:00:00Z','streak-40':'2026-10-29T00:00:00Z'};assert.ok(validEarned(earned));assert.equal(card(0,earned).skin,'gold');assert.equal(card(0,earned).next,60);assert.equal(card(0,earned).value,40);
});
test('Word and lesson tracks earn upgrades without confusing self-report and tests',()=>{
 const earned=eligibleAchievements({...base,known:100});assert.ok(earned.some(a=>a.id==='known-100'));assert.ok(!earned.some(a=>a.metric==='testedWords'));
 assert.equal(achievementCards({...base,testedWords:250},{}).find(c=>c.id==='testedWords').skin,'diamond');assert.ok(validTrackAward('words-250'));assert.equal(validTrackAward('words-251'),false);
});
