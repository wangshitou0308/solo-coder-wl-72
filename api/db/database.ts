import { DatabaseSync, type StatementSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export type SqlParam = string | number | bigint | Buffer | null | undefined;

export interface Row {
  [key: string]: unknown;
}

export function run(sql: string, ...params: SqlParam[]): { changes: number; lastInsertRowid: number | bigint } {
  const stmt: StatementSync = db.prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: typeof result.changes === 'bigint' ? Number(result.changes) : result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

export function all<T = Row>(sql: string, ...params: SqlParam[]): T[] {
  const stmt: StatementSync = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function get<T = Row>(sql: string, ...params: SqlParam[]): T | undefined {
  const stmt: StatementSync = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

export { db };
