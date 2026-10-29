import { db } from '../server/db.ts';
const [email, role] = process.argv.slice(2);
if (!email || !['USER', 'ADMIN'].includes(role))
    throw new Error('Usage: npm run db:role -- existing-email USER|ADMIN');
try {
    const user = await db.user.update({ where: { email }, data: { role: role as 'USER' | 'ADMIN' }, select: { id: true, role: true } });
    console.log(user);
}
finally {
    await db.$disconnect();
}
