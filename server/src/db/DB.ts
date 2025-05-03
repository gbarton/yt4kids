import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import path from 'path';
import Logger from '../lib/Log';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// let db = getDB();

let _db : NodePgDatabase;

// ? not sold on this route, but will come back later
export function getDB(init: boolean = false) {
  Logger.trace('getDB() called');
  if (!_db || init) {
    const url = Bun.env.DATABASE_URL || 'localhost';
    Logger.debug(`getDB() init ${url.split('@').pop()}`);
    _db = drizzle(url);
  }
  return _db;
}

// export default db;

export async function migrateDB() {
  Logger.info('migration started');
  const db = getDB();
  Logger.info('main db connected');

  const migrationPath = path.join(process.cwd(), 'db/migrations');
  try {
    await migrate(db, {
        migrationsFolder: migrationPath,
    });
  } catch(err) {
    Logger.error(err);
    Logger.error('migration failed, exiting');
    process.exit(1);
  }
  Logger.info("migration completed");
}
