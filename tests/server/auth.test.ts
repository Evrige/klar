import 'dotenv/config';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname)||new URL(url).pathname!=='/klar_test')throw new Error('Auth tests require local klar_test');
// Tests must never use live mail credentials from the developer environment.
process.env.MAIL_PROVIDER='smtp';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
process.env.DATABASE_URL=url;process.env.DATABASE_ADAPTER='pg';process.env.NODE_ENV='test';
const {db}=await import('../../server/db.ts');
const {createAuth}=await import('../../server/auth.ts');
const {createLocalServer}=await import('../../server/dev.ts');
const origin=process.env.BETTER_AUTH_URL!,password='Klar-test-password-2026!',newPassword='Klar-new-password-2026!';
let ip=10;
const email=()=>`auth-${randomUUID()}@example.invalid`;
const cookie=(response:Response)=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
function request(path:string,body?:unknown,session?:string){return new Request(new URL(`/api/auth/${path}`,origin),{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':`127.0.0.${ip++}`,...(session?{cookie:session}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
after(async()=>{await db.$disconnect();});

test('private profile supports validated name changes only for the authenticated account',async()=>{
    const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const root=`http://127.0.0.1:${(server.address() as {port:number}).port}/api`,headers={origin,'content-type':'application/json','x-forwarded-for':'127.0.0.243'};
    const ids:string[]=[];
    try{
        const sessions:string[]=[];
        for(const name of ['Profile one','Profile two']){
            const signup=await fetch(root+'/auth/sign-up/email',{method:'POST',headers,body:JSON.stringify({email:email(),password,name})});assert.equal(signup.status,200);sessions.push(cookie(signup));ids.push((await signup.json()).user.id);
        }
        assert.equal((await fetch(root+'/account/details')).status,401);
        const write=(body:unknown)=>fetch(root+'/account/details',{method:'PATCH',headers:{...headers,cookie:sessions[0]},body:JSON.stringify(body)});
        assert.equal((await write({name:'x'})).status,400);
        assert.equal((await write({name:'Intruder',userId:ids[1]})).status,400);
        assert.equal((await write({name:'Intruder',role:'ADMIN'})).status,400);
        const updated=await write({name:'  New learner  '});assert.equal(updated.status,200);assert.equal((await updated.json()).name,'New learner');
        const own=await fetch(root+'/account/details',{headers:{cookie:sessions[0]}}),details=await own.json();assert.equal(details.name,'New learner');assert.ok(details.email);assert.ok(details.createdAt);assert.equal(details.role,undefined);
        assert.equal((await db.user.findUniqueOrThrow({where:{id:ids[1]}})).name,'Profile two');
    }finally{await db.user.deleteMany({where:{id:{in:ids}}});await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});

test('default registration signs in immediately and never sends a verification email',async()=>{
    const sent:unknown[]=[],auth=createAuth({sendMail:async message=>{sent.push(message);}}),address=email();
    const response=await auth.handler(request('sign-up/email',{email:address,password,name:'Immediate learner'}));
    assert.equal(response.status,200);assert.ok((await response.json()).token);
    assert.equal(sent.length,0);
    assert.equal((await auth.handler(request('sign-in/email',{email:address,password}))).status,200);
});
test('email signup stores a library hash, defaults USER, signs in and revokes logout session',async()=>{
    const auth=createAuth({requireVerification:false}),address=email();
    const response=await auth.handler(request('sign-up/email',{email:address,password,name:'Email learner',role:'ADMIN'}));assert.equal(response.status,200);
    const user=await db.user.findUniqueOrThrow({where:{email:address}});assert.equal(user.role,'USER');assert.equal(user.emailVerified,false);
    const account=await db.account.findFirstOrThrow({where:{userId:user.id,providerId:'credential'}});assert(account.password&&account.password!==password);assert(!account.password.includes(password));
    const signupCookie=cookie(response);const signed=await auth.handler(request('get-session',undefined,signupCookie));assert.equal((await signed.json()).user.id,user.id);
    assert.equal((await auth.handler(request('sign-in/email',{email:address,password:'wrong-password'}))).status,401);
    const login=await auth.handler(request('sign-in/email',{email:address,password}));assert.equal(login.status,200);const loginCookie=cookie(login);
    assert.equal((await auth.handler(request('sign-out',{},loginCookie))).status,200);assert.equal(await (await auth.handler(request('get-session',undefined,loginCookie))).json(),null);
    const duplicate=await auth.handler(request('sign-up/email',{email:address,password,name:'Duplicate'}));assert.notEqual(duplicate.status,200);assert.equal(await db.user.count({where:{email:address}}),1);
});
test('malformed email and short passwords are rejected without creating users',async()=>{
    const auth=createAuth({requireVerification:false}),address=email();
    assert.equal((await auth.handler(request('sign-up/email',{email:'not-email',password,name:'Invalid'}))).status,400);
    assert.equal((await auth.handler(request('sign-up/email',{email:address,password:'short',name:'Invalid'}))).status,400);assert.equal(await db.user.count({where:{email:address}}),0);
});
test('verification gates sign-in and a real library verification link activates the account',async()=>{
    const sent:{to:string;text:string}[]=[],auth=createAuth({requireVerification:true,sendMail:async message=>{sent.push(message);}}),address=email();
    const signup=await auth.handler(request('sign-up/email',{email:address,password,name:'Verify learner',callbackURL:origin+'/?auth=verified'}));assert.equal(signup.status,200);assert.equal((await signup.json()).token,null);assert.equal(sent.length,1);
    const denied=await auth.handler(request('sign-in/email',{email:address,password}));assert.equal(denied.status,403);assert.equal((await denied.json()).code,'EMAIL_NOT_VERIFIED');
    const link=sent[0].text.match(/https?:\/\/\S+/)![0];const verified=await auth.handler(new Request(link));assert.equal(verified.status,302);assert.equal((await db.user.findUniqueOrThrow({where:{email:address}})).emailVerified,true);assert.equal((await auth.handler(request('sign-in/email',{email:address,password}))).status,200);
});
test('reset is single-use, rejects expired tokens and revokes existing sessions',async()=>{
    const sent:{to:string;text:string}[]=[],auth=createAuth({requireVerification:false,sendMail:async message=>{sent.push(message);}}),address=email();
    const signup=await auth.handler(request('sign-up/email',{email:address,password,name:'Reset learner'}));const oldCookie=cookie(signup);
    const known=await auth.handler(request('request-password-reset',{email:address,redirectTo:origin+'/?auth=reset-password'}));const unknown=await auth.handler(request('request-password-reset',{email:email(),redirectTo:origin+'/?auth=reset-password'}));assert.equal(known.status,200);assert.deepEqual(await known.json(),await unknown.json());assert.equal(sent.length,1);
    const link=sent[0].text.match(/https?:\/\/\S+/)![0],callback=await auth.handler(new Request(link));assert.equal(callback.status,302);const token=new URL(callback.headers.get('location')!).searchParams.get('token');assert(token);
    assert.equal((await auth.handler(request('reset-password',{token:'invalid-token',newPassword}))).status,400);
    assert.equal((await auth.handler(request('reset-password',{token,newPassword}))).status,200);assert.equal((await auth.handler(request('reset-password',{token,newPassword}))).status,400);
    assert.equal(await (await auth.handler(request('get-session',undefined,oldCookie))).json(),null);assert.equal((await auth.handler(request('sign-in/email',{email:address,password}))).status,401);assert.equal((await auth.handler(request('sign-in/email',{email:address,password:newPassword}))).status,200);
    await auth.handler(request('request-password-reset',{email:address,redirectTo:origin+'/?auth=reset-password'}));const second=new URL(sent.at(-1)!.text.match(/https?:\/\/\S+/)![0]).pathname.split('/').at(-1)!;await db.verification.updateMany({where:{identifier:`reset-password:${second}`},data:{expiresAt:new Date(Date.now()-1000)}});assert.equal((await auth.handler(request('reset-password',{token:second,newPassword:password}))).status,400);
});
test('untrusted reset redirects are rejected and OAuth account linking is disabled',async()=>{
    const sent:unknown[]=[],auth=createAuth({requireVerification:false,sendMail:async message=>{sent.push(message);}});
    const result=await auth.handler(request('request-password-reset',{email:email(),redirectTo:'https://untrusted.invalid/reset'}));assert.equal(result.status,403);assert.equal(sent.length,0);assert.equal(auth.options.account?.accountLinking?.enabled,false);
});
test('actual HTTP email signup cookie authenticates private API and missing SMTP is explicit',async()=>{
    const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const root=`http://127.0.0.1:${(server.address() as {port:number}).port}/api`;
    try{
        const headers={origin,'content-type':'application/json','x-forwarded-for':'127.0.0.240'},address=email();const signup=await fetch(root+'/auth/sign-up/email',{method:'POST',headers,body:JSON.stringify({email:address,password,name:'HTTP learner'})});assert.equal(signup.status,200);const session=cookie(signup);const me=await fetch(root+'/me',{headers:{cookie:session}});assert.equal(me.status,200);assert.equal((await me.json()).role,'USER');assert.match(signup.headers.get('cache-control')??'',/no-store/);
        if(!process.env.SMTP_HOST){const reset=await fetch(root+'/auth/request-password-reset',{method:'POST',headers,body:JSON.stringify({email:address})});assert.equal(reset.status,503);assert.equal((await reset.json()).error,'AUTH_MAIL_NOT_CONFIGURED');}
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test('SMTP sender delivers only to a local capture server in this test',async()=>{
    const {createServer}=await import('node:net');const messages:string[]=[];
    const server=createServer(socket=>{
        socket.setEncoding('utf8');socket.write('220 localhost SMTP test\r\n');let buffer='',data=false,body:string[]=[];
        socket.on('data',chunk=>{buffer+=chunk;let index:number;while((index=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
            if(data){if(line==='.'){messages.push(body.join('\r\n'));body=[];data=false;socket.write('250 accepted\r\n');}else body.push(line);continue;}
            if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 SIZE 100000\r\n');
            else if(line==='DATA'){data=true;socket.write('354 end with dot\r\n');}
            else if(line==='QUIT')socket.end('221 bye\r\n');else socket.write('250 OK\r\n');
        }});
    });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const keys=['SMTP_HOST','SMTP_PORT','SMTP_FROM','SMTP_SECURE','SMTP_USER','SMTP_PASS'] as const,old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
    process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_PORT=String((server.address() as {port:number}).port);process.env.SMTP_FROM='Klar <no-reply@example.invalid>';process.env.SMTP_SECURE='false';delete process.env.SMTP_USER;delete process.env.SMTP_PASS;
    try{const {sendAuthMail}=await import('../../server/mail.ts');await sendAuthMail({to:'capture@example.invalid',subject:'SMTP capture test',text:'Local test only'});assert.equal(messages.length,1);assert(messages[0].includes('capture@example.invalid'));assert(messages[0].includes('Local test only'));}
    finally{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test('loopback alias supports signup callback, private writes and session authentication',async()=>{
    const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const root=`http://127.0.0.1:${(server.address() as {port:number}).port}/api`,alias=new URL(origin);alias.hostname='127.0.0.1';
    try{
        const headers={origin:alias.origin,'content-type':'application/json','x-forwarded-for':'127.0.0.241'};const signup=await fetch(root+'/auth/sign-up/email',{method:'POST',headers,body:JSON.stringify({email:email(),password,name:'Alias learner',callbackURL:alias.origin+'/?auth=verified'})});assert.equal(signup.status,200);const session=cookie(signup);
        const me=await fetch(root+'/me',{headers:{cookie:session}});assert.equal(me.status,200);const user=await me.json();
        const sync=await fetch(root+'/sync',{method:'POST',headers:{...headers,cookie:session,'x-klar-owner':user.id},body:JSON.stringify({deviceId:randomUUID(),events:[]})});assert.equal(sync.status,200);
        const blocked=await fetch(root+'/sync',{method:'POST',headers:{...headers,origin:'https://untrusted.invalid',cookie:session},body:JSON.stringify({deviceId:randomUUID(),events:[]})});assert.equal(blocked.status,403);
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
