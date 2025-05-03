import { setupDockerTestDb } from "../SetupFor.test";
import { expect, describe, beforeAll, afterAll, it } from "bun:test";
import { treaty } from '@elysiajs/eden';
import Logger from '../Log';
import { getDB, migrateDB } from '../../db/DB';
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { VideoEndpoints, Videos } from "./Videos";
import { Authors } from "./Authors";


describe("Users tests", () => {
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


  it('should insert a video', async() => {
    const authors = new Authors();

    const author = await authors.insertAuthor({
      id: "authorid",
      name: "author 1",
      url: "bla bla bla"
    });

    const videos = new Videos();

    const video = await videos.insertVideo({
      id: "1234",
      authorId: "authorid",
      durationText: "bla",
      title: "some title",
      durationSeconds: 300,
    });

    expect(video).toBeObject();
    expect(video?.id).toEqual("1234");
  });

  it('should find a video case insensitive', async () => {
    const test = treaty(VideoEndpoints);

    const res = await test.videos.search.get({query: { search: "SOME", limit: 10, offset: 0 }});

    expect(res.status).toBe(200);
    expect(res?.data).toBeObject();
    expect(res?.data?.query).toBe("SOME");
    expect(res?.data?.videos[0].title).toBe('some title');
  });

  it('should return not found for non-existent video', async () => {
    const test = treaty(VideoEndpoints);

    const res = await test.videos({id: 'nonexistent'}).get();
    expect(res.status).toBe(400);
  });

  it('should return error for invalid video chunk request', async () => {
    const test = treaty(VideoEndpoints);

    // Insert a video first
    const videos = new Videos();
    await videos.insertVideo({
      id: "11213",
      authorId: "authorid",
      durationText: "bla",
      title: "some title",
      durationSeconds: 300,
    });

    const res = await test.videos({id: '11213'}).chunk.get();
    expect(res.status).toBe(400);
  });

  it('should return error for invalid video thumbnail request', async () => {
    const test = treaty(VideoEndpoints);

    // Insert a video first
    const videos = new Videos();
    await videos.insertVideo({
      id: "141516",
      authorId: "authorid",
      durationText: "bla",
      title: "some title",
      durationSeconds: 300,
    });

    const res = await test.videos({id: '141516'}).thumbnail.get();
    expect(res.status).toBe(400);
  });
  
});
