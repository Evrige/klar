import { db } from './db.ts';
import {appOrigins} from './origins.ts';
export async function rateLimit(userId: string, bucket: string, limit = 60) { const key = `${userId}:${bucket}`; const rows = await db.$queryRaw<{
    count: number;
}[]> `INSERT INTO "RateLimit" (key,"window",count) VALUES (${key},date_trunc('minute',clock_timestamp()),1) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."window" < date_trunc('minute',clock_timestamp()) THEN 1 ELSE "RateLimit".count+1 END, "window"=date_trunc('minute',clock_timestamp()) RETURNING count`; if (rows[0].count > limit)
    throw Object.assign(new Error('Too many requests'), { status: 429 }); }
export function assertOrigin(headers: Headers) { const allowed=appOrigins(); if (!allowed.length)
    throw new Error('BETTER_AUTH_URL required'); if (!allowed.includes(headers.get('origin')??''))
    throw Object.assign(new Error('Origin rejected'), { status: 403 }); }
