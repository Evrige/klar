import 'dotenv/config';
import assert from 'node:assert/strict';

const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw new Error('Build smoke check requires local klar_test');
process.env.DATABASE_URL=url;
process.env.DATABASE_ADAPTER='pg';
// No tsx loader: the exact deployed entry point must load as plain JavaScript.
const {default:handler}=await import('../api/index.mjs');
async function request(path){
    const headers=new Map();let status=200,body;
    const res={setHeader:(key,value)=>headers.set(key,value),status(code){status=code;return this;},json(value){body=value;return this;}};
    await handler({query:{path},method:'GET',headers:{}},res);
    return {status,body,headers};
}
try{
    const providers=await request('providers');
    assert.equal(providers.status,200);assert.equal(providers.body.emailPassword,true);
    assert.equal(providers.body.verificationRequired,false);
    assert.match(providers.headers.get('Cache-Control'),/no-store/);
    assert.equal((await request('me')).status,401);
    const rows=await globalThis.klarDb.$queryRawUnsafe('SELECT 1::int AS value');
    assert.equal(rows[0].value,1);
    console.log('Built API: plain Node import, providers 200, private API 401, Prisma PostgreSQL query passed.');
}finally{await globalThis.klarDb.$disconnect();}
