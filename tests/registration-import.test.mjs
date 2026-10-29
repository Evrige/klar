import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareRegistrationImport,completeRegistrationImport} from '../src/sync/registrationImport.ts';

test('registration imports a stable guest snapshot only into its account and retries after failure',async()=>{
    const entries=new Map();
    globalThis.localStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
    localStorage.setItem('klar:xp:v1','120');
    prepareRegistrationImport('new-account');
    localStorage.setItem('klar:xp:v1','140');
    prepareRegistrationImport('new-account');
    const calls=[];
    const request=async(path,method,body)=>{calls.push({path,method,body});return {id:'batch'};};
    await completeRegistrationImport('other-account',request);
    assert.equal(calls.length,0);
    await assert.rejects(completeRegistrationImport('new-account',async()=>{throw new Error('offline');}));
    assert.ok(localStorage.getItem('klar:account:new-account:registration-import:v1'));
    await completeRegistrationImport('new-account',request);
    await completeRegistrationImport('new-account',request);
    assert.equal(calls.length,1);
    assert.equal(calls[0].body.snapshot['klar:xp:v1'],120);
    assert.equal(calls[0].path,'import');
    assert.equal(localStorage.getItem('klar:xp:v1'),'140');
    assert.equal(localStorage.getItem('klar:account:new-account:registration-import:v1'),null);
});
