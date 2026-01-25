import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import {Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
dotenv.config({ path: '../.env' });
neonConfig.webSocketConstructor = ws;


const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;