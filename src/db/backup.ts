import type { DB } from './database';

// Raw table snapshots for backup / restore. Every user-data table is copied verbatim — soft-
// deleted expenses included — so a restore reproduces the database exactly. Tables are listed
// parents first; inserts run in this order and deletes in reverse.
export const BACKUP_TABLES = [
  'categories', 'recurrence_rules', 'payment_accounts', 'expenses', 'receipt_images', 'recurring_expenses', 'preferences',
] as const;
export type BackupTable = typeof BACKUP_TABLES[number];

export type SqlValue = string | number | null;
// Columnar: names once, then one value array per row — far smaller than an object per row.
export interface TableDump { columns: string[]; rows: SqlValue[][]; }
export type TableDumps = Record<BackupTable, TableDump>;

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

async function columnsOf(db: DB, table: string): Promise<string[]> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${q(table)})`);
  return cols.map((c) => c.name);
}

export async function dumpTables(db: DB): Promise<TableDumps> {
  const out = {} as TableDumps;
  for (const t of BACKUP_TABLES) {
    const columns = await columnsOf(db, t);
    const rows = await db.getAllAsync<Record<string, SqlValue>>(`SELECT ${columns.map(q).join(', ')} FROM ${q(t)}`);
    out[t] = { columns, rows: rows.map((r) => columns.map((c) => r[c] ?? null)) };
  }
  return out;
}

// Replaces every backed-up table with the snapshot, all or nothing. Columns the current schema
// no longer has are dropped, and columns an older backup lacks take their defaults. Foreign
// keys are off for the swap — deleting expenses would otherwise cascade, and the pragma is a
// no-op inside a transaction, so it is toggled around it.
export async function replaceAllTables(db: DB, tables: TableDumps): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const t of [...BACKUP_TABLES].reverse()) await db.execAsync(`DELETE FROM ${q(t)};`);
      for (const t of BACKUP_TABLES) {
        const dump = tables[t];
        if (!dump.rows.length) continue;
        const current = new Set(await columnsOf(db, t));
        const keep = dump.columns.map((c, i) => [c, i] as const).filter(([c]) => current.has(c));
        if (!keep.length) continue;
        const stmt = await db.prepareAsync(
          `INSERT INTO ${q(t)} (${keep.map(([c]) => q(c)).join(', ')}) VALUES (${keep.map(() => '?').join(', ')})`,
        );
        try {
          for (const row of dump.rows) await stmt.executeAsync(keep.map(([, i]) => row[i] ?? null));
        } finally {
          await stmt.finalizeAsync();
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
