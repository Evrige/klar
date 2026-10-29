import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from './db.ts';
import {mailConfigured,sendAuthMail,type MailSender} from './mail.ts';
import {waitUntil} from '@vercel/functions';
import {appOrigins} from './origins.ts';
export const emailVerificationRequired=false;
export function createAuth(options:{sendMail?:MailSender;requireVerification?:boolean}={}){
    const sender=options.sendMail??(mailConfigured()?sendAuthMail:undefined);
    const requireVerification=options.requireVerification??emailVerificationRequired;
    return betterAuth({
    database: prismaAdapter(db, { provider: 'postgresql',transaction:true }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins:appOrigins(),
    emailAndPassword: {
        enabled:true,minPasswordLength:12,maxPasswordLength:128,
        requireEmailVerification:requireVerification,
        revokeSessionsOnPasswordReset:true,resetPasswordTokenExpiresIn:3600,
        ...(sender?{sendResetPassword:async({user,url}:{user:{email:string};url:string})=>sender({to:user.email,subject:'Klar — восстановление пароля / відновлення пароля',text:`Чтобы задать новый пароль, откройте ссылку. / Щоб установити новий пароль, відкрийте посилання.\n\n${url}\n\nСсылка действует 1 час. Если вы не запрашивали сброс, проигнорируйте письмо. / Посилання діє 1 годину. Якщо ви не запитували скидання, проігноруйте лист.`})}:{}),
    },
    ...(sender&&requireVerification?{emailVerification:{
        sendOnSignUp:requireVerification,sendOnSignIn:requireVerification,
        autoSignInAfterVerification:true,expiresIn:3600,
        sendVerificationEmail:async({user,url}:{user:{email:string};url:string})=>sender({to:user.email,subject:'Klar — подтверждение email / підтвердження email',text:`Подтвердите ваш email для Klar. / Підтвердьте ваш email для Klar.\n\n${url}\n\nСсылка действует 1 час. / Посилання діє 1 годину.`}),
    }}:{}),
    // A matching email alone must not join an unverified password account to OAuth.
    account:{accountLinking:{enabled:false}},
    advanced:{disableOriginCheck:false,disableCSRFCheck:false,...(process.env.VERCEL?{backgroundTasks:{handler:waitUntil}}:{})},
    user: { additionalFields: { role: { type: ['USER', 'ADMIN'], defaultValue: 'USER', input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    socialProviders: {
        ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } } : {}),
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } } : {}),
    },
    rateLimit: { enabled: true, storage: 'database', modelName: 'AuthRateLimit' },
});}
export const auth=createAuth();
export async function requireUser(headers: Headers) { const session = await auth.api.getSession({ headers }); if (!session)
    throw Object.assign(new Error('Unauthorized'), { status: 401 }); return session.user.id; }
export async function requireAdmin(headers: Headers) { const id = await requireUser(headers); const user = await db.user.findUnique({ where: { id }, select: { role: true } }); if (user?.role !== 'ADMIN')
    throw Object.assign(new Error('Forbidden'), { status: 403 }); return id; }
