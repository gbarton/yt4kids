import { setupDockerTestDb } from "../SetupFor.test";
import { expect, describe, beforeAll, afterAll, it } from "bun:test";
import { treaty } from '@elysiajs/eden';
import Logger from '../Log';
import { getDB, migrateDB } from '../../db/DB';
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Authors, AuthorsEndpoints } from "./Authors";

describe("Authors tests", () => {
  let stop: () => Promise<void>;
  let db: NodePgDatabase;

  beforeAll(async () => {
    Logger.debug('starting tests');
    const setup = await setupDockerTestDb();
    stop = setup.stop;
    if (setup.db) {
      db = setup.db;
    }
    getDB(true);
    await migrateDB();
  });

  afterAll(async () => {
    await stop();
  });

  it('should insert an author', async() => {
    const authors = new Authors();

    const author = await authors.insertAuthor({
      id: "authorid",
      name: "author 1",
      url: "bla bla bla"
    });

    expect(author).toBeObject();
    expect(author?.id).toEqual("authorid");
  });

  it('should find an author', async () => {
    const authors = new Authors();
    const a = await authors.getAuthor('authorid');

    expect(a?.name).toEqual("author 1");

    const test = treaty(AuthorsEndpoints);

    const res = await test.authors.get({query: { query: "author", limit: 10, offset: 0 }});

    expect(res.status).toBe(200);
    expect(res?.data).toBeObject();
    expect(res?.data?.authors.length).toEqual(1);
  });

  it('should return not found for non-existent author', async () => {
    const test = treaty(AuthorsEndpoints);
    const res = await test.authors({id: 'nonexistent'}).get();
    expect(res.status).toBe(400);
  });

  it('should fail to get non-existent thumbnail', async () => {
    const test = treaty(AuthorsEndpoints);
    const res = await test.authors({ id: 'nothing' }).thumbnail.get();
    expect(res.status).toBe(400);
  });
});