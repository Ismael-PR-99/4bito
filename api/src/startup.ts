import fs from 'fs';
import path from 'path';
import { pool } from './db';

export function validateEnv(): void {
  if (!process.env.JWT_SECRET) {
    console.error('[startup] Missing required env var: JWT_SECRET');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    const missing = (['DB_HOST', 'DB_NAME', 'DB_USER'] as const).filter(k => !process.env[k]);
    if (missing.length) {
      console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
      process.exit(1);
    }
  }
}

export async function runMigrations(): Promise<void> {
  const migDir = path.resolve(__dirname, '../migrations');
  if (!fs.existsSync(migDir)) return;

  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
      await pool.query(sql);
      console.log(`[migrations] ✓ ${file}`);
    } catch (e: any) {
      if (e.code === '42P07' || e.code === '42710') continue; // already exists — safe to skip
      throw e;
    }
  }
}
