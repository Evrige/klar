import {z} from 'zod';
import {db,serial,lockUser} from './db.ts';
const profileSchema=z.object({handle:z.string().regex(/^[a-z0-9_]{3,24}$/),displayName:z.string().trim().min(2).max(60),listed:z.boolean()}).strict();
export async function setProfile(userId:string,raw:unknown){const data=profileSchema.parse(raw);return serial(async tx=>{await lockUser(tx,userId);const taken=await tx.publicProfile.findUnique({where:{handle:data.handle}});if(taken&&taken.userId!==userId)throw Object.assign(new Error('Handle is already taken'),{status:409});return tx.publicProfile.upsert({where:{userId},create:{userId,...data},update:data});});}
export async function getProfile(userId:string){return db.publicProfile.findUnique({where:{userId}});}
