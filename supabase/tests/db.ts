import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

// Fresh in-memory Postgres with the Supabase stub and every migration applied.
export async function createDb() {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, 'supabase-stub.sql'), 'utf8'));
  const migrations = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of migrations) {
    await db.exec(readFileSync(join(root, 'migrations', file), 'utf8'));
  }
  return db;
}

export async function createUser(db: PGlite, id: string, name = id) {
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [uuid(id), { display_name: name }]);
}

// Server-side write, e.g. the RevenueCat webhook granting an entitlement.
export async function grant(db: PGlite, id: string, entitlement: 'purchased' | 'premium') {
  await db.query(`update public.profiles set ${entitlement} = true where id = $1`, [uuid(id)]);
}

// Run queries as a signed-in app user, with row level security applied.
export function as<T>(db: PGlite, id: string, fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uuid(id)]);
    return fn(tx);
  });
}

// Readable test ids ("A", "B") mapped to stable UUIDs.
export function uuid(id: string) {
  const hex = Buffer.from(id).toString('hex').padStart(12, '0').slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}
