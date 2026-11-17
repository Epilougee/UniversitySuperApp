import { createClient } from '@supabase/supabase-js';

// ── Supabase client (server-side, uses publishable key) ──────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── query<T>: run a parameterized SQL query via Supabase RPC ─────────────────
// All queries are delegated to PostgreSQL through Supabase's REST / RPC layer.
// We expose the same query() / run() / runGetId() signatures as the old sql.js
// db.ts so that every API route works without changes.

type ParamValue = string | number | boolean | null;

/**
 * Run a SELECT-like query. Converts positional ? placeholders → $1, $2, …
 * and calls the `run_query` Postgres function (defined in supabase_schema.sql).
 */
export async function query<T = any>(sql: string, params: ParamValue[] = []): Promise<T[]> {
  // Convert SQLite ? style → PostgreSQL $1 style
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);

  const { data, error } = await supabase.rpc('run_query', {
    query_text: pgSql,
    query_params: params,
  });

  if (error) {
    console.error('Supabase query error:', error.message, '\nSQL:', pgSql, '\nParams:', params);
    throw new Error(error.message);
  }

  return (data as T[]) || [];
}

/**
 * Run an INSERT / UPDATE / DELETE statement that returns nothing.
 */
export async function run(sql: string, params: ParamValue[] = []): Promise<void> {
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);

  const { error } = await supabase.rpc('run_statement', {
    stmt_text: pgSql,
    stmt_params: params,
  });

  if (error) {
    console.error('Supabase run error:', error.message, '\nSQL:', pgSql);
    throw new Error(error.message);
  }
}

/**
 * Run an INSERT and return the auto-generated id.
 * PostgreSQL: append RETURNING id to the statement.
 */
export async function runGetId(sql: string, params: ParamValue[] = []): Promise<number> {
  let idx = 0;
  let pgSql = sql.replace(/\?/g, () => `$${++idx}`);

  // Append RETURNING id if not already present
  if (!/returning\s+id/i.test(pgSql)) {
    pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
  }

  const { data, error } = await supabase.rpc('run_query', {
    query_text: pgSql,
    query_params: params,
  });

  if (error) {
    console.error('Supabase runGetId error:', error.message);
    throw new Error(error.message);
  }

  return (data as any[])?.[0]?.id || 0;
}

// Keep saveDb as a no-op for compatibility with server.ts imports
export function saveDb(): void { /* no-op — Supabase persists automatically */ }

// getDb is no longer needed but export for any legacy imports
export async function getDb() { return supabase; }
