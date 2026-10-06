import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/models/schema.ts',
  out: './server/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/solvexa' },
});
