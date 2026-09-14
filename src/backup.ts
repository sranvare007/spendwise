import { Platform } from 'react-native';
import { Zip, ZipDeflate, ZipPassThrough, Unzip, UnzipInflate, strToU8, strFromU8 } from 'fflate';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from './db/database';
import { SCHEMA_VERSION } from './db/schema';
import { BACKUP_TABLES, TableDumps, dumpTables, replaceAllTables } from './db/backup';
import { receiptsDir, deleteAllReceiptFiles } from './receipts';

// SpendWise backup file: a standard .zip holding
//   data.json          every table as columns + rows (deflated)
//   receipts/<name>    receipt photos, stored as-is (JPEGs don't compress further)
//   manifest.json      format + schema version, counts, and CRC-32 checksums of everything
// Files are streamed in and out in chunks, so a large photo library never has to sit in
// memory at once. A restore is fully read and verified into a staging folder before the
// database is touched.

const FORMAT = 'spendwise-backup';
const FORMAT_VERSION = 1;
const CHUNK = 256 * 1024;
// Receipt names we write are "r<timestamp>.<ext>"; anything else (e.g. "../x") is refused.
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export interface BackupManifest {
  format: typeof FORMAT;
  formatVersion: number;
  schemaVersion: number;
  createdAt: string;
  counts: { expenses: number; categories: number; paymentSources: number; recurring: number; receipts: number };
  data: { size: number; crc32: number };
  receipts: { name: string; size: number; crc32: number }[];
}

export interface PendingRestore { manifest: BackupManifest; tables: TableDumps; staging: Directory; }

// Thrown with a message that can be shown to the user as-is.
export class BackupError extends Error {}

// ---- CRC-32 (the zip polynomial), chainable across chunks ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
export function crc32(data: Uint8Array, prev = 0): number {
  let c = prev ^ -1;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const col = (tables: TableDumps, table: keyof TableDumps, name: string) => tables[table].columns.indexOf(name);

function countsOf(tables: TableDumps, receipts: number): BackupManifest['counts'] {
  const del = col(tables, 'expenses', 'is_deleted');
  return {
    expenses: tables.expenses.rows.filter((r) => del === -1 || !r[del]).length,
    categories: tables.categories.rows.length,
    paymentSources: tables.payment_accounts.rows.length,
    recurring: tables.recurring_expenses.rows.length,
    receipts,
  };
}

// ---------------- export ----------------

export async function createBackupFile(): Promise<{ file: File; manifest: BackupManifest }> {
  const db = await getDatabase();
  const tables = await dumpTables(db);
  const dataBytes = strToU8(JSON.stringify({ tables }));

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const out = new File(Paths.cache, `SpendWise-backup-${stamp}.zip`);
  if (out.exists) out.delete();
  out.create();

  const handle = out.open();
  let zipError: Error | null = null;
  try {
    const zip = new Zip((err, chunk) => {
      if (err) zipError = err;
      else handle.writeBytes(chunk);
    });

    const data = new ZipDeflate('data.json', { level: 9 });
    zip.add(data);
    data.push(dataBytes, true);

    // Only photos an expense still references; orphaned files stay behind.
    const uriCol = col(tables, 'receipt_images', 'uri');
    const names = [...new Set(tables.receipt_images.rows.map((r) => String(r[uriCol] ?? '')))].filter((n) => SAFE_NAME.test(n));
    const dir = receiptsDir();
    const receipts: BackupManifest['receipts'] = [];
    for (const name of names) {
      const src = new File(dir, name);
      if (!src.exists) continue;
      const entry = new ZipPassThrough(`receipts/${name}`);
      zip.add(entry);
      const h = src.open();
      let size = 0, crc = 0;
      try {
        const total = h.size ?? 0;
        do {
          const chunk = total - size > 0 ? h.readBytes(Math.min(CHUNK, total - size)) : new Uint8Array(0);
          size += chunk.length;
          crc = crc32(chunk, crc);
          entry.push(chunk, chunk.length === 0 || size >= total);
          if (chunk.length === 0) break;
        } while (size < total);
      } finally {
        h.close();
      }
      receipts.push({ name, size, crc32: crc });
    }

    const manifest: BackupManifest = {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      createdAt: now.toISOString(),
      counts: countsOf(tables, receipts.length),
      data: { size: dataBytes.length, crc32: crc32(dataBytes) },
      receipts,
    };
    const man = new ZipDeflate('manifest.json', { level: 9 });
    zip.add(man);
    man.push(strToU8(JSON.stringify(manifest, null, 2)), true);
    zip.end();
    if (zipError) throw zipError;
    return { file: out, manifest };
  } catch (e) {
    try { handle.close(); } catch {}
    try { out.delete(); } catch {}
    throw e;
  } finally {
    try { handle.close(); } catch {}
  }
}

// Resolves false when the device cannot share files.
export async function shareBackupFile(file: File): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Save SpendWise backup' });
  return true;
}

// ---------------- import ----------------

// Android storage providers label zips inconsistently, so accept any file there and let
// validation decide.
export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === 'ios' ? 'application/zip' : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

const stagingDir = () => new Directory(Paths.document, 'restore-staging');

// Reads and verifies a backup without changing any app data. Receipt photos are extracted
// into a staging folder; call applyRestore() to commit or discardRestore() to drop it.
export async function readBackup(uri: string): Promise<PendingRestore> {
  const staging = stagingDir();
  if (staging.exists) staging.delete();
  staging.create({ intermediates: true });

  const texts: Record<string, Uint8Array[]> = {};
  const extracted = new Map<string, { size: number; crc32: number }>();
  const openHandles = new Set<ReturnType<File['open']>>();
  let streamError = false;

  const src = new File(uri);
  try {
    const unzip = new Unzip((entry) => {
      if (entry.name === 'manifest.json' || entry.name === 'data.json') {
        const parts: Uint8Array[] = [];
        texts[entry.name] = parts;
        entry.ondata = (err, chunk) => { if (err) streamError = true; else parts.push(chunk); };
        entry.start();
        return;
      }
      const name = entry.name.startsWith('receipts/') ? entry.name.slice('receipts/'.length) : '';
      if (!SAFE_NAME.test(name) || extracted.has(name)) return; // ignore anything unexpected
      const f = new File(staging, name);
      f.create({ overwrite: true });
      const fh = f.open();
      openHandles.add(fh);
      let size = 0, crc = 0;
      entry.ondata = (err, chunk, final) => {
        if (err) { streamError = true; return; }
        fh.writeBytes(chunk);
        size += chunk.length;
        crc = crc32(chunk, crc);
        if (final) { fh.close(); openHandles.delete(fh); extracted.set(name, { size, crc32: crc }); }
      };
      entry.start();
    });
    unzip.register(UnzipInflate);

    const h = src.open();
    try {
      const total = h.size ?? 0;
      let read = 0;
      if (total === 0) throw new BackupError('That file is empty.');
      while (read < total) {
        const chunk = h.readBytes(Math.min(CHUNK, total - read));
        if (chunk.length === 0) break;
        read += chunk.length;
        unzip.push(chunk, read >= total);
      }
    } finally {
      h.close();
    }

    if (!texts['manifest.json'] || !texts['data.json']) throw new BackupError('That file is not a SpendWise backup.');
    if (streamError) throw new BackupError('This backup file is damaged and cannot be restored.');

    let manifest: BackupManifest;
    try { manifest = JSON.parse(strFromU8(concat(texts['manifest.json']))); } catch { throw new BackupError('That file is not a SpendWise backup.'); }
    if (manifest?.format !== FORMAT) throw new BackupError('That file is not a SpendWise backup.');
    if (manifest.formatVersion > FORMAT_VERSION || manifest.schemaVersion > SCHEMA_VERSION) {
      throw new BackupError('This backup was made by a newer version of SpendWise. Update the app, then try again.');
    }

    const dataBytes = concat(texts['data.json']);
    if (dataBytes.length !== manifest.data?.size || crc32(dataBytes) !== manifest.data?.crc32) {
      throw new BackupError('This backup file is damaged and cannot be restored.');
    }
    let tables: TableDumps;
    try { tables = JSON.parse(strFromU8(dataBytes)).tables; } catch { throw new BackupError('This backup file is damaged and cannot be restored.'); }
    for (const t of BACKUP_TABLES) {
      const d = tables?.[t];
      if (!d || !Array.isArray(d.columns) || !Array.isArray(d.rows) || d.rows.some((r) => !Array.isArray(r) || r.length !== d.columns.length)) {
        throw new BackupError('This backup file is damaged and cannot be restored.');
      }
    }
    for (const r of manifest.receipts ?? []) {
      const got = extracted.get(r.name);
      if (!got || got.size !== r.size || got.crc32 !== r.crc32) throw new BackupError('Receipt photos in this backup are damaged, so it cannot be restored.');
    }

    return { manifest, tables, staging };
  } catch (e) {
    for (const fh of openHandles) { try { fh.close(); } catch {} }
    try { staging.delete(); } catch {}
    if (e instanceof BackupError) throw e;
    throw new BackupError('That file could not be read as a SpendWise backup.');
  } finally {
    try { src.delete(); } catch {} // the picker's cache copy
  }
}

// Replaces all app data with the backup. The database swap is a single transaction — if it
// fails nothing changes. Photos are swapped only once it has committed.
export async function applyRestore(p: PendingRestore): Promise<void> {
  const db = await getDatabase();
  await replaceAllTables(db, p.tables);
  deleteAllReceiptFiles();
  const dir = receiptsDir();
  dir.create({ idempotent: true, intermediates: true });
  for (const item of p.staging.list()) {
    if (item instanceof File) {
      try { item.move(new File(dir, item.name)); } catch {}
    }
  }
  discardRestore(p);
}

export function discardRestore(p: PendingRestore) {
  try { if (p.staging.exists) p.staging.delete(); } catch {}
}
