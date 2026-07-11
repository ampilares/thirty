import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const DB_PATH = process.env.THIRTY_DB_PATH ?? path.join(process.cwd(), "data", "thirty.db");

const globalForDb = globalThis as unknown as { __thirtyDb?: DB; __thirtySqlite?: Database.Database };

export function getDb(): DB {
  if (globalForDb.__thirtyDb) return globalForDb.__thirtyDb;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  globalForDb.__thirtyDb = db;
  globalForDb.__thirtySqlite = sqlite;
  return db;
}

/** Closes the connection (needed on Windows before the db file can be replaced). */
export function closeDb(): void {
  globalForDb.__thirtySqlite?.close();
  globalForDb.__thirtySqlite = undefined;
  globalForDb.__thirtyDb = undefined;
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
