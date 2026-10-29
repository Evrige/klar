export type AuthReturn={token?:string;notice?:'invalid'|'verified'|'password-changed';open:boolean};
export function parseAuthReturn(search:string):AuthReturn{
    const p=new URLSearchParams(search),kind=p.get('auth'),token=p.get('token');
    if(kind==='reset-password')return token&&token.length<=4096&&!p.has('error')?{token,open:true}:{notice:'invalid',open:true};
    if(kind==='verified')return {notice:p.has('error')?'invalid':'verified',open:true};
    if(kind==='password-changed')return {notice:'password-changed',open:true};
    return {open:false};
}
