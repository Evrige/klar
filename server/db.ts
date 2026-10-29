import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
export function createDb(url = process.env.DATABASE_URL, adapter = process.env.DATABASE_ADAPTER) {
    if (!url)
        throw new Error('DATABASE_URL is required on the server');
    const config = { connectionString: url, max: 5, options: '-c timezone=UTC' };
    return new PrismaClient({ adapter: adapter === 'pg' ? new PrismaPg(config) : new PrismaNeon(config) });
}
const globalDb = globalThis as typeof globalThis & {
    klarDb?: ReturnType<typeof createDb>;
};
export const db = globalDb.klarDb ??= createDb();
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
export async function serial<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let n = 0;; n++)
        try {
            return await db.$transaction(work, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 30000 });
        }
        catch (error) {
            const e = error as {
                code?: string;
                meta?: {
                    code?: string;
                    driverAdapterError?: {
                        cause?: {
                            originalCode?: string;
                        };
                    };
                };
            };
            const codes = [e?.code, e?.meta?.code, e?.meta?.driverAdapterError?.cause?.originalCode];
            const retryable = codes.some(code => code !== undefined && ['P2034', 'P2002', '40001', '40P01'].includes(code));
            if (n >= 4 || !retryable)
                throw error;
            await new Promise(r => setTimeout(r, 20 * (n + 1) + Math.random() * 40));
        }
}
export async function lockUser(tx: Tx, userId: string) { await tx.$queryRaw `SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`; }
