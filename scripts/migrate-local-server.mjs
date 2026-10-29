import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import pg from 'pg';

// Explicit local-only move. Existing target databases/roles are never overwritten.
const root=process.cwd(),source=new URL(process.env.DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(source.hostname)||source.port!=='55432'||source.pathname!=='/klar_dev')throw new Error('Expected original local Klar server on port 55432');
if(!process.env.POSTGRES_ADMIN_PASSWORD)throw new Error('POSTGRES_ADMIN_PASSWORD is required in local .env');
const bin='C:/Program Files/PostgreSQL/18/bin';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=path.join(root,'.local-postgres','backups',stamp);
const databases=['klar_dev','klar_test'];
const identifier=value=>'"'+value.replaceAll('"','""')+'"';
const sourceConfig={host:source.hostname,port:55432,user:decodeURIComponent(source.username),password:decodeURIComponent(source.password),connectionTimeoutMillis:5000};
const admin=new pg.Client({host:'127.0.0.1',port:5432,user:'postgres',password:process.env.POSTGRES_ADMIN_PASSWORD,database:'postgres',connectionTimeoutMillis:5000});
async function run(tool,args,config){
    await new Promise((resolve,reject)=>{
        const child=spawn(path.join(bin,tool+'.exe'),args,{windowsHide:true,stdio:['ignore','ignore','pipe'],env:{...process.env,PGHOST:config.host,PGPORT:String(config.port),PGUSER:config.user,PGPASSWORD:config.password??'',PGDATABASE:config.database}});
        // Never print restore stderr: COPY diagnostics can contain private rows.
        child.stderr.resume();child.on('error',()=>reject(new Error(`${tool} could not start`)));child.on('close',code=>code===0?resolve():reject(new Error(`${tool} failed (${code}); original databases remain unchanged`)));
    });
}
async function counts(config){
    const client=new pg.Client(config);try{await client.connect();const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");const result={};
        for(const {tablename}of tables.rows){const r=await client.query(`SELECT count(*)::text AS n FROM public.${identifier(tablename)}`);result[tablename]=r.rows[0].n;}return result;
    }finally{await client.end();}
}
function setEnv(contents,key,value){const line=`${key}=${value}`;return new RegExp(`^${key}=.*$`,'m').test(contents)?contents.replace(new RegExp(`^${key}=.*$`,'m'),()=>line):contents.trimEnd()+'\n'+line+'\n';}
try{
    await admin.connect();
    const existing=await admin.query('SELECT datname FROM pg_database WHERE datname=ANY($1::text[])',[databases]);
    if(existing.rowCount)throw new Error('A target Klar database already exists; refusing to overwrite it');
    const version=await admin.query('SHOW server_version_num');if(Number(version.rows[0].server_version_num)<180000)throw new Error('Target PostgreSQL must be version 18 or newer for this dump');
    fs.mkdirSync(backupDir,{recursive:true});
    const expected={};
    for(const database of databases){const config={...sourceConfig,database};expected[database]=await counts(config);await run('pg_dump',['-w','--format=custom','--no-owner','--no-acl','--file',path.join(backupDir,database+'.dump')],config);}
    fs.copyFileSync(path.join(root,'.env'),path.join(backupDir,'source.env'));
    console.log('Original databases and local configuration backed up.');
    let role='klar_app';if((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount)role+='_'+randomBytes(4).toString('hex');
    const password=randomBytes(32).toString('hex');
    await admin.query(`CREATE ROLE ${identifier(role)} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    const reports=[];
    for(const database of databases){await admin.query(`CREATE DATABASE ${identifier(database)} OWNER ${identifier(role)} TEMPLATE template0 ENCODING 'UTF8'`);
        const config={host:'127.0.0.1',port:5432,user:role,password,database,connectionTimeoutMillis:5000};
        await run('pg_restore',['-w','--exit-on-error','--no-owner','--no-acl','--dbname',database,path.join(backupDir,database+'.dump')],config);
        const actual=await counts(config);if(JSON.stringify(actual)!==JSON.stringify(expected[database]))throw new Error(`Row counts differ in ${database}; configuration has not been switched`);
        reports.push({database,tables:Object.keys(actual).length,users:Number(actual.User??0),words:Number(actual.Word??0),rowsVerified:true});
    }
    function urlFor(database){const url=new URL('postgresql://127.0.0.1:5432/'+database);url.username=role;url.password=password;return url.href;}
    let env=fs.readFileSync(path.join(root,'.env'),'utf8');
    for(const [key,value]of Object.entries({DATABASE_URL:urlFor('klar_dev'),DATABASE_URL_UNPOOLED:urlFor('klar_dev'),DATABASE_ADAPTER:'pg',TEST_DATABASE_URL:urlFor('klar_test')}))env=setEnv(env,key,value);
    fs.writeFileSync(path.join(root,'.env'),env);
    fs.writeFileSync(path.join(backupDir,'verification.json'),JSON.stringify({createdAt:new Date(),sourcePort:55432,targetPort:5432,role,reports},null,2));
    console.log(JSON.stringify({moved:true,host:'127.0.0.1',port:5432,applicationRole:role,reports,backupDirectory:backupDir}));
}catch(error){console.error({moved:false,message:error.code?`PostgreSQL error ${error.code}`:error.message,originalDatabasesRetained:true});process.exitCode=1;}
finally{await admin.end();}
