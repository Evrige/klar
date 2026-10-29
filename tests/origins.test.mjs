import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appOrigins} from '../server/origins.ts';
test('local aliases keep the configured port and never allow external hosts',()=>{
    const origins=appOrigins('http://localhost:5173',false);assert(origins.includes('http://127.0.0.1:5173'));assert(origins.includes('http://localhost:5173'));assert(!origins.includes('http://localhost:5174'));assert(!origins.includes('https://untrusted.invalid'));
});
test('production and public base URLs do not gain localhost aliases',()=>{
    assert.deepEqual(appOrigins('https://klar.example',true),['https://klar.example']);assert.deepEqual(appOrigins('https://klar.example',false),['https://klar.example']);assert.deepEqual(appOrigins('http://localhost:5173',true),['http://localhost:5173']);
});
