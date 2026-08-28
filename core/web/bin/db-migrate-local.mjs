#!/usr/bin/env node
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const migrationsDir = resolve(root, "core/web/server/db/migrations");

export const DEFAULT_DATABASE_URL = "file:./data/local.sqlite";

export const resolveSqlitePath = (databaseUrl = DEFAULT_DATABASE_URL, repoRoot = root) => {
  const trimmed = databaseUrl.trim();
  const withoutScheme = trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
  if (isAbsolute(withoutScheme)) {
    return withoutScheme;
  }
  return resolve(repoRoot, withoutScheme);
};

export const listMigrationSqlFiles = (dir = migrationsDir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => join(dir, name));

export const applyLocalSqliteMigration = (dbPath, sqlPaths = listMigrationSqlFiles()) => {
  const paths = Array.isArray(sqlPaths) ? sqlPaths : [sqlPaths];
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  try {
    for (const sqlPath of paths) {
      const sql = readFileSync(sqlPath, "utf8");
      db.exec(sql);
    }
  } finally {
    db.close();
  }
  return { dbPath, sqlPaths: paths };
};

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const dbPath = resolveSqlitePath(databaseUrl);
  const result = applyLocalSqliteMigration(dbPath);
  for (const sqlPath of result.sqlPaths) {
    console.log(`[db:migrate:local] Applied ${sqlPath}`);
  }
  console.log(`[db:migrate:local] Database: ${result.dbPath}`);
}
