import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';

const file='.env.neon.local';
function fail(message){console.error(message);process.exit(1);}
if(!existsSync(file))fail(`Заполните ${file}: DATABASE_URL и DATABASE_URL_UNPOOLED из Neon.`);
const config=parseEnv(readFileSync(file,'utf8'));
let pooled,direct;
try{pooled=new URL(config.DATABASE_URL);direct=new URL(config.DATABASE_URL_UNPOOLED);}catch{fail(`В ${file} нужны две настоящие строки подключения Neon.`);}
for(const url of [pooled,direct]){
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.neon.tech')||!url.username||!url.password)fail('Подготовка разрешена только для PostgreSQL Neon с заполненными учётными данными.');
}
if(direct.hostname.includes('-pooler.'))fail('DATABASE_URL_UNPOOLED должен быть прямым подключением без -pooler.');
if(pooled.hostname.replace('-pooler.','.')!==direct.hostname||pooled.pathname!==direct.pathname)fail('Оба подключения должны вести в одну базу и одну ветку Neon.');
const env={...process.env,...config,DATABASE_ADAPTER:'neon'};
// Pass configuration only to child processes; never replace the local .env.
const steps=[['Генерация Prisma Client',['node_modules/prisma/build/index.js','generate']],['Применение подготовленных миграций в Neon',['node_modules/prisma/build/index.js','migrate','deploy']],['Загрузка учебного каталога',['--import','tsx','prisma/seed.ts']]];
for(const [label,args] of steps){
    console.log(label);
    const result=spawnSync(process.execPath,args,{env,stdio:'inherit',windowsHide:true});
    if(result.error)fail('Не удалось запустить этап подготовки.');
    if(result.status!==0)process.exit(result.status??1);
}
console.log('База Neon подготовлена. Публикация приложения не выполнялась.');
