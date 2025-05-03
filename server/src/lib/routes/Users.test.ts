import { setupDockerTestDb } from "../SetupFor.test";
import { expect, describe, beforeAll, afterAll, it } from "bun:test";
import { treaty } from '@elysiajs/eden';
import Logger from '../Log';
import { getDB, migrateDB } from '../../db/DB';
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { UserEndpoints } from "./User";


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

  it('should create a user', async() => {
    const test = treaty(UserEndpoints);
    const res = await test.user.register.post({
      admin: true,
      displayName: 'testUser',
      email: 'test@example.com',
      password: '1234',
      verifyPassword: '1234',
    });

    expect(res.status).toBe(200);
    expect(res.data?.success).toBeTruthy();
  });

  it('should fail to make the same user', async() => {
    const test = treaty(UserEndpoints);
    const res = await test.user.register.post({
      admin: true,
      displayName: 'testUser',
      email: 'test@example.com',
      password: '1234',
      verifyPassword: '1234',
    });

    expect(res.status).toBe(400);
  });

  it('should login user', async() => {
    const test = treaty(UserEndpoints);
    const res = await test.user.login.post({
      email: 'test@example.com',
      password: '1234',
    });

    expect(res.status).toBe(200);
    expect(res.data?.success).toBeTrue();
    expect(res.data?.profile).toBeObject();
    expect(res.data?.profile?.email).toBe('test@example.com');
    expect(res.data?.exp).toBeNumber();
  });

  it('should fail to login with bad password', async() => {
    const test = treaty(UserEndpoints);
    const res = await test.user.login.post({
      email: 'test@example.com',
      password: '123456',
    });

    expect(res.status).toBe(401);

  });

  it('should logout without login', async() => {
    const test = treaty(UserEndpoints);
    const res = await test.user.logout.post({},{
      headers: {
        'x-cflr-token': 'foo',
      }
    });

    expect(res.status).toBe(401);
  });
});