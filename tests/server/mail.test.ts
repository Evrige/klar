import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MailtrapClient,type Mail} from 'mailtrap';
import {mailConfigured,sendAuthMail} from '../../server/mail.ts';

test('Mailtrap normalizes auth mail for the configured sender and actual user; no live delivery',async t=>{
    const keys=['MAIL_PROVIDER','MAILTRAP_API_TOKEN','MAILTRAP_FROM_EMAIL','MAILTRAP_FROM_NAME'] as const;
    const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
    try{
        process.env.MAIL_PROVIDER='mailtrap';delete process.env.MAILTRAP_API_TOKEN;delete process.env.MAILTRAP_FROM_EMAIL;
        assert.equal(mailConfigured(),false);
        await assert.rejects(sendAuthMail({to:'learner@example.invalid',subject:'Verify',text:'Verification link'}),/AUTH_MAIL_NOT_CONFIGURED/);
        process.env.MAILTRAP_API_TOKEN='local-test-token';process.env.MAILTRAP_FROM_EMAIL='no-reply@example.invalid';process.env.MAILTRAP_FROM_NAME='Klar';
        assert.equal(mailConfigured(),true);
        const sent:Mail[]=[];
        const mock=t.mock.method(MailtrapClient.prototype,'send',async(message:Mail)=>{sent.push(message);return {success:true,message_ids:['captured']};});
        await sendAuthMail({to:'learner@example.invalid',subject:'Verify',text:'Verification link'});
        assert.equal(sent.length,1);
        assert.deepEqual(sent[0].from,{email:'no-reply@example.invalid',name:'Klar'});
        assert.equal(sent[0].to[0].email,'learner@example.invalid');
        assert.ok('category' in sent[0]);assert.equal(sent[0].category,'Klar Authentication');
        assert.ok('text' in sent[0]);assert.equal(sent[0].text,'Verification link');
        mock.mock.mockImplementation(async()=>{throw new Error('Sensitive SDK request local-test-token');});
        await assert.rejects(sendAuthMail({to:'learner@example.invalid',subject:'Verify',text:'Verification link'}),{message:'AUTH_MAIL_DELIVERY_FAILED'});
        process.env.MAIL_PROVIDER='unknown';assert.equal(mailConfigured(),false);
    }finally{
        for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}
    }
});
