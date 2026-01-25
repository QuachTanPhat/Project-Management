import { defineConfig } from '@prisma/config';
import 'dotenv/config';
export default defineConfig({
  datasources: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL, 
  },
});