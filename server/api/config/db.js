import { PrismaClient } from '@prisma/client';
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
export const prisma = new PrismaClient({
    log: ['error'],
});
