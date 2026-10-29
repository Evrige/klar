import type { VercelRequest, VercelResponse } from './vercel.ts';
import { z } from 'zod';
import { auth, requireUser, requireAdmin,emailVerificationRequired } from './auth.ts';
import {mailConfigured} from './mail.ts';
import { assertOrigin, rateLimit } from './http.ts';
import { importSnapshot,previewSnapshot } from './import.ts';
import { importSchema, unknownIds } from './validation.ts';
import { readProgress } from './progress.ts';
import { syncEvents } from './sync.ts';
import { exportAccount, deleteAccount } from './account.ts';
import { joinQueue, cancelQueue, getMatch, submitRound, leaveMatch, leaderboard, queueSchema } from './competition.ts';
import { db } from './db.ts';
import {getProfile,setProfile} from './profile.ts';
import {expireMatches} from './competition.ts';
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Vary', 'Cookie');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
        const path = String(req.query.path ?? '').replace(/^\/+|\/+$/g, ''), method = req.method ?? 'GET';
        const headers = new Headers();
        for (const [key, v] of Object.entries(req.headers))
            if (v)
                headers.set(key, Array.isArray(v) ? v.join(',') : v);
        const serialized = req.body === undefined ? '' : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(serialized) > 2 * 1024 * 1024)
            throw Object.assign(new Error('Payload exceeds 2 MiB'), { status: 413 });
        if(path==='maintenance/expire'&&method==='GET'){
            if(!process.env.CRON_SECRET||headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`){res.status(401).json({error:'Unauthorized'});return;}
            res.json({expired:await expireMatches()});return;
        }
        if (path === 'auth' || path.startsWith('auth/')) {
            if(['auth/send-verification-email','auth/verify-email'].includes(path)){res.status(404).json({error:'Not found'});return;}
            const requiresMail=path==='auth/request-password-reset';
            if(requiresMail&&!mailConfigured()){res.status(503).json({error:'AUTH_MAIL_NOT_CONFIGURED'});return;}
            const url = new URL(`/api/${path}`, process.env.BETTER_AUTH_URL);
            for (const [key, value] of Object.entries(req.query))
                if (key !== 'path' && typeof value === 'string')
                    url.searchParams.set(key, value);
            const response = await auth.handler(new Request(url, { method, headers, ...(!['GET', 'HEAD'].includes(method) ? { body: serialized } : {}) }));
            res.statusCode = response.status;
            response.headers.forEach((value, key) => { if (key !== 'set-cookie')
                res.setHeader(key, value); });
            res.setHeader('Cache-Control','private, no-store, max-age=0');
            const cookies = response.headers.getSetCookie();
            if (cookies.length)
                res.setHeader('Set-Cookie', cookies);
            res.end(await response.text());
            return;
        }
        if (path === 'providers' && method === 'GET') {
            res.json({ github: !!process.env.GITHUB_CLIENT_ID&&!!process.env.GITHUB_CLIENT_SECRET, google: !!process.env.GOOGLE_CLIENT_ID&&!!process.env.GOOGLE_CLIENT_SECRET,emailPassword:true,verificationRequired:emailVerificationRequired,emailDelivery:mailConfigured() });
            return;
        }
        const userId = await requireUser(headers);
        // An owner hint is never authentication; it only prevents an old tab
        // from writing one account's outbox after another tab changes session.
        if(path!=='me'&&headers.has('x-klar-owner')&&headers.get('x-klar-owner')!==userId){res.status(409).json({error:'ACCOUNT_CHANGED'});return;}
        await rateLimit(userId, 'api', 120);
        if (!['GET', 'HEAD'].includes(method))
            assertOrigin(headers);
        const body = serialized ? JSON.parse(serialized) : {};
        if(path==='account/details'&&(method==='GET'||method==='PATCH')){
            const select={name:true,email:true,createdAt:true} as const;
            if(method==='PATCH'){
                const data=z.object({name:z.string().trim().min(2).max(80)}).strict().parse(body);
                res.json(await db.user.update({where:{id:userId},data,select}));
            }else res.json(await db.user.findUniqueOrThrow({where:{id:userId},select}));
            return;
        }
        if (path === 'me' && method === 'GET') {
            res.json(await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }));
            return;
        }
        if(path==='profile'&&method==='GET'){res.json(await getProfile(userId));return;}
        if(path==='profile'&&method==='PUT'){res.json(await setProfile(userId,body));return;}
        if (path === 'progress' && method === 'GET') {
            const deviceId = z.uuid().optional().parse(req.query.deviceId);
            res.json(await readProgress(userId, deviceId));
            return;
        }
        if (path === 'import/preview' && method === 'POST') {
            res.json(await previewSnapshot(userId,body));
            return;
        }
        if (path === 'import' && method === 'POST') {
            await rateLimit(userId, 'import', 5);
            res.json(await importSnapshot(userId, body));
            return;
        }
        if (path === 'sync' && method === 'POST') {
            await rateLimit(userId, 'sync', 30);
            res.json(await syncEvents(userId, body));
            return;
        }
        if (path === 'account/export' && method === 'GET') {
            res.json(await exportAccount(userId));
            return;
        }
        if (path === 'account' && method === 'DELETE') {
            z.object({ confirm: z.literal('DELETE') }).strict().parse(body);
            res.json(await deleteAccount(userId));
            return;
        }
        if (path === 'admin/access' && method === 'GET') {
            await requireAdmin(headers);
            res.json({ role: 'ADMIN' });
            return;
        }
        if (path === 'competition/queue' && method === 'POST') {
            await rateLimit(userId, 'queue', 10);
            res.json(await joinQueue(userId, body));
            return;
        }
        if (path === 'competition/queue' && method === 'DELETE') {
            await cancelQueue(userId);
            res.json({ cancelled: true });
            return;
        }
        if (path === 'competition/queue' && method === 'GET') {
            res.json(await db.queueEntry.findFirst({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, status: true, matchId: true, expiresAt: true } }));
            return;
        }
        if (path === 'competition/submit' && method === 'POST') {
            await rateLimit(userId, 'submit', 20);
            res.json(await submitRound(userId, body));
            return;
        }
        if (path === 'competition/match' && method === 'GET') {
            res.json(await getMatch(userId, z.uuid().parse(req.query.id), typeof req.query.after === 'string' ? req.query.after : '0'));
            return;
        }
        if (path === 'competition/leave' && method === 'POST') {
            const { matchId } = z.object({ matchId: z.uuid() }).strict().parse(body);
            await leaveMatch(userId, matchId);
            res.json({ left: true });
            return;
        }
        if (path === 'competition/leaderboard' && method === 'GET') {
            const filter = queueSchema.omit({ ranked: true }).parse({ seasonId: req.query.seasonId, mode: req.query.mode, level: req.query.level });
            const entries = await leaderboard(filter.seasonId, filter.mode, filter.level);
            res.json(entries.map((e, i) => ({ place: i + 1, ...e })));
            return;
        }
        res.status(404).json({ error: 'Not found' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid payload', issues: error.issues });
            return;
        }
        const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : error instanceof SyntaxError ? 400 : 500;
        res.status(status).json({ error: status < 500 && error instanceof Error ? error.message : 'Request failed' });
        if (status >= 500)
            console.error('Klar API failure', error instanceof Error ? error.name : 'unknown');
    }
}
