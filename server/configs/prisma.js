import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import {Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '../.env' }); // Hoặc đường dẫn đúng tới file .env của bạn
}
neonConfig.webSocketConstructor = ws;



const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ LỖI: Không tìm thấy DATABASE_URL. Hãy kiểm tra Environment Variables trên Vercel!");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;