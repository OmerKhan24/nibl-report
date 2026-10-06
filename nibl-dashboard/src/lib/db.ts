/**
 * PostgreSQL connection to the NIBL Contabo server.
 * Uses a module-level pool so connections are reused across warm serverless invocations.
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  if (!process.env.PG_HOST) throw new Error('PG_HOST env var not set');

  pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT ?? '5432'),
    database: process.env.PG_DB ?? 'nibl-pos-production',
    user: process.env.PG_USER ?? 'odoo19',
    password: process.env.PG_PASS,
    max: 3,           // keep low for serverless — each function instance gets 3 max
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false }, // server uses self-signed cert
  });

  return pool;
}

export async function sqlQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
