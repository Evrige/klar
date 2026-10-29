export function appOrigins(baseURL=process.env.BETTER_AUTH_URL,production=process.env.NODE_ENV==='production'||!!process.env.VERCEL){
    if(!baseURL)return [];
    const url=new URL(baseURL),origins=new Set([url.origin]);
    // Loopback aliases only, same scheme and port. Never extend production origins.
    if(!production&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)){
        for(const host of ['localhost','127.0.0.1','[::1]']){const alias=new URL(url);alias.hostname=host;origins.add(alias.origin);}
    }
    return [...origins];
}
