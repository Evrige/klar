import {deviceId,localSnapshot} from './storage.ts';

const key=(userId:string)=>`klar:account:${userId}:registration-import:v1`;

// Bind the snapshot to the account returned by sign-up, never to a later login.
// Keep it unchanged until acknowledgement so retries use the same checksum.
export function prepareRegistrationImport(userId:string){
    if(!localStorage.getItem(key(userId)))localStorage.setItem(key(userId),JSON.stringify({schemaVersion:1,deviceId:deviceId(),snapshot:localSnapshot(true)}));
}

export async function completeRegistrationImport(userId:string,request:(path:string,method:'POST',body:unknown)=>Promise<unknown>){
    const pending=localStorage.getItem(key(userId));
    if(!pending)return;
    const report=await request('import','POST',JSON.parse(pending));
    localStorage.setItem(`klar:account:${userId}:last-import-report:v1`,JSON.stringify(report));
    localStorage.removeItem(key(userId));
}
