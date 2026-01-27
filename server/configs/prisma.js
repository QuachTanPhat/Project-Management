import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing')
}

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaNeon({connectionString})
const prisma = global.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma
}

export default prisma