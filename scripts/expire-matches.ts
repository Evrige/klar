import { expireMatches } from '../server/competition.ts';
import { db } from '../server/db.ts';
try {
    console.log({ expired: await expireMatches() });
}
finally {
    await db.$disconnect();
}
