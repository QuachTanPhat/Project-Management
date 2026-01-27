import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import {Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '../.env' }); 
}
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
console.log("--------------- DEBUG CONNECTION ---------------");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL status:", connectionString ? "✅ Đã tìm thấy" : "❌ Bị Null/Undefined");
if (connectionString) {
    console.log("DATABASE_URL length:", connectionString.length); // In độ dài để chắc chắn không phải chuỗi rỗng
}
console.log("------------------------------------------------");

if (!connectionString) {
  throw new Error("❌ CRITICAL ERROR: DATABASE_URL is missing. Please check Vercel Env Vars.");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;