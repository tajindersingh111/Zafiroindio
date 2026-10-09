import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const int = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required to initialize Prisma Client.");
  }
  // Bounded pool: under a traffic spike requests queue briefly and fail fast instead of opening
  // hundreds of connections and exhausting Postgres. Size it to (DB max_connections / instances).
  const adapter = new PrismaPg({
    connectionString,
    max: int(process.env.DB_POOL_MAX, 15),
    connectionTimeoutMillis: int(process.env.DB_CONNECT_TIMEOUT_MS, 10_000),
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}

// Reused across hot reloads in dev and across route modules in production (one pool per process).
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
