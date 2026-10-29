import 'dotenv/config';
import {defineConfig} from 'prisma/config';
export default defineConfig({schema:'prisma/schema.prisma',migrations:{path:'prisma/migrations',seed:'tsx prisma/seed.ts'},datasource:{url:process.env.DATABASE_URL_UNPOOLED ?? 'postgresql://klar:klar_local@127.0.0.1:55432/klar_dev'}});
