import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString:        process.env.DATABASE_URL,
        ssl:                     { rejectUnauthorized: false },
        max:                     10,
        idleTimeoutMillis:       30_000,
        connectionTimeoutMillis: 2_000,
      }
    : {
        host:                    process.env.DB_HOST,
        port:                    parseInt(process.env.DB_PORT ?? '5432'),
        database:                process.env.DB_NAME,
        user:                    process.env.DB_USER,
        password:                process.env.DB_PASS,
        max:                     10,
        idleTimeoutMillis:       30_000,
        connectionTimeoutMillis: 2_000,
      }
);
