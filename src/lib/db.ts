import { PrismaClient } from '@prisma/client';

const globalDb = globalThis as unknown as { ordersDb?: PrismaClient };
export const db = globalDb.ordersDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.ordersDb = db;
