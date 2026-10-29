import {z} from 'zod';
import {db} from '../server/db.ts';
const [id,startsAt,endsAt]=z.tuple([z.string().regex(/^[a-z0-9-]{3,100}$/),z.iso.datetime(),z.iso.datetime()]).parse(process.argv.slice(2));
if(Date.parse(startsAt)>=Date.parse(endsAt))throw new Error('Season start must precede end');
try{console.log(await db.season.create({data:{id,startsAt:new Date(startsAt),endsAt:new Date(endsAt)}}));}finally{await db.$disconnect();}
