import { PrismaClient } from '@prisma/client';

declare global {
  var __musicPlatformPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__musicPlatformPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__musicPlatformPrisma = prisma;
}
