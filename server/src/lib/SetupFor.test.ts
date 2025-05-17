import { PostgreSqlContainer } from '@testcontainers/postgresql'
// import { Wait } from 'testcontainers';
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres';
import Logger from './Log';
import { Wait } from 'testcontainers';
// import postgres from 'postgres'

// simple promise we can wait for to 'sleep'
const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export async function setupDockerTestDb() {
  // @see https://github.com/testcontainers/testcontainers-node/issues/807
  // @see https://www.answeroverflow.com/m/1128519076952682517
  Logger.info('setting up pg container');
  try {
    // const container = await new PostgreSqlContainer('postgres:17').start();
    const container = await new PostgreSqlContainer('postgres:17')
      .withWaitStrategy(Wait.forLogMessage('ready to accept connections',2)).start();

    const connectionString = container.getConnectionUri();
    // we set this so that bun picks it up when the classes start to load
    process.env.DATABASE_URL= connectionString;
    Logger.info(`container started, setting up conns ${connectionString}`);

    const db = drizzle(connectionString);
  
    try {
      const confirmDatabaseReady = await db.execute(sql`SELECT 1`)
    } catch (err) {
      Logger.warn("error trying to poll pg");
    }
  
    Logger.info('pg container setup done');
  
    return { async stop() { await container.stop();}, db }
  } catch (err) {
    Logger.warn('error setting up pg container, ignoring', err);
    return { async stop() { Logger.info('nothing to stop')}}
  }
}