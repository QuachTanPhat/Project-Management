import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing')
}

const sql = neon(process.env.DATABASE_URL)
const adapter = new PrismaNeon(sql)

const prisma = global.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
