import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, MIGRATIONS } from './schema';
import { seedIfEmpty, ensureDefaultCategories, ensurePaymentSchema } from './seed';

export type DB = SQLite.SQLiteDatabase;

const DB_NAME = 'spendwise.db';
let dbPromise: Promise<DB> | null = null;

// Returns a singleton, fully-migrated, seeded database handle.
export function getDatabase(): Promise<DB> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init(): Promise<DB> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const statements = MIGRATIONS[v] || [];
    await db.withTransactionAsync(async () => {
      for (const sql of statements) await db.execAsync(sql);
    });
  }
  if (current < SCHEMA_VERSION) {
    // PRAGMA user_version does not accept bound params; SCHEMA_VERSION is a trusted constant.
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  await ensurePaymentSchema(db);
  await seedIfEmpty(db);
  await ensureDefaultCategories(db);
  return db;
}
