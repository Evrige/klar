import 'dotenv/config';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw new Error('Guide test requires local klar_test');
process.env.DATABASE_URL=url;process.env.DATABASE_ADAPTER='pg';
const {db}=await import('../../server/db.ts');
const {syncEvents}=await import('../../server/sync.ts');
const {readProgress}=await import('../../server/progress.ts');
const {firstSteps}=await import('../../src/data/firstSteps.ts');
test('book practice synchronizes its journal and mistakes without inventing catalog word IDs',async()=>{
    const id=`guide-${randomUUID()}`,row=firstSteps[0].rows[0];
    try{
        await db.user.create({data:{id,name:'Guide test',email:`${id}@example.invalid`}});
        const input={deviceId:randomUUID(),events:[{kind:'attempt',clientEventId:randomUUID(),occurredAt:Date.now(),payload:{key:`${row.id}:uk`,domain:'word',prompt:row.german,answers:[row.translation.uk],answer:'неправильно',correct:false,explanation:`${row.german} — ${row.translation.uk}`,audio:row.german}}]};
        await syncEvents(id,input);await syncEvents(id,input);
        const progress=await readProgress(id),learning=progress.snapshot['klar:learning:v1']!;
        assert.equal(learning.mistakes[`${row.id}:uk`].failures,1);
        assert.equal(Object.values(learning.journal!.days).reduce((count,day)=>count+day.attempts,0),1);
        assert.equal(await db.userWordSkill.count({where:{userId:id}}),0);
        assert.equal(await db.rating.count({where:{userId:id}}),0);
    }finally{await db.user.deleteMany({where:{id}});await db.$disconnect();}
});
