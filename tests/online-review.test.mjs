import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speedReview} from '../src/online/speedReview.ts';
const time=Date.parse('2026-11-01T12:00:00Z');
function fixture(){return {current:{scoring:'SPEED',status:'ACTIVE',finishedAt:null},rounds:[{id:'old',number:1,status:'FINISHED',question:{prompt:'Haus',choices:[{id:'a',text:'дом'}]},answers:['дом']},{id:'next',number:2,status:'SCHEDULED',startsAt:new Date(time+3000).toISOString()}]};}
test('speed review keeps the completed question for the three-second server intermission',()=>{
 const match=fixture();assert.equal(speedReview(match,time).seconds,3);assert.equal(speedReview(match,time+1000).seconds,2);assert.equal(speedReview(match,time+2000).seconds,1);assert.equal(speedReview(match,time+3000),null);assert.equal(speedReview(match,time).round.id,'old');
});
test('speed review does not reveal unfinished answers or alter accuracy mode',()=>{
 const match=fixture();match.current.scoring='ACCURACY';assert.equal(speedReview(match,time),null);match.current.scoring='SPEED';match.rounds[0].answers=undefined;assert.equal(speedReview(match,time),null);match.rounds[0].answers=['дом'];match.rounds[0].status='OPEN';assert.equal(speedReview(match,time),null);
});
test('final speed answer stays visible for three seconds, including after reconnect',()=>{
 const match=fixture();match.current.status='FINISHED';match.current.finishedAt=new Date(time).toISOString();match.rounds.pop();assert.equal(speedReview(match,time).final,true);assert.equal(speedReview(match,time+2500).seconds,1);assert.equal(speedReview(match,time+3000),null);assert.equal(speedReview(match,time+20000),null);
});
