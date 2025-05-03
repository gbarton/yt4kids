import { setupDockerTestDb } from '../SetupFor.test';
import { expect, describe, beforeAll, afterAll, it } from 'bun:test';
import { treaty } from '@elysiajs/eden';
import Logger from '../Log';
import { getDB, migrateDB } from '../../db/DB';
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { QueueTable } from "../../db/schema";
import { QueueEndpoints, Queues } from './Queues';

describe('Queues tests', () => {
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

  it('should handle an empty queue', async () => {
    const queues = new Queues();

    // Get the next item in the queue when it's empty
    const nextItem = await queues.getNextInQueue();
    expect(nextItem).toBeNull();
  });

  it('should insert multiple items into the queue', async () => {
    const queues = new Queues();

    for (let i = 0; i < 10; i++) {
      const newItem = await queues.insertQueue({
        id: `item${i}`,
        authorId: 'authorid',
        title: `Title ${i}`,
        complete: false,
        skip: false,
      });
      expect(newItem).toBeObject();
      expect(newItem?.id).toEqual(`item${i}`);
    }
  });

  it('should get the next item in the queue', async () => {
    const queues = new Queues();

    // Get all items from the queue
    const allItems = await db.select().from(QueueTable);
    expect(allItems.length).toBe(10);

    // Get the first item in the queue
    const firstItem = await queues.getNextInQueue();
    expect(firstItem?.id).toEqual('item0');
    if (firstItem !== null) {
      await queues.skip(firstItem.id);
  
      // Get the next item in the queue after marking the first item as complete
      const secondItem = await queues.getNextInQueue();
      expect(secondItem?.id).toEqual('item1');
    }

  });

  it('should get a queue item by id', async () => {
    const queues = new Queues();

    // Insert an item into the queue
    const newItem = await queues.insertQueue({
      id: 'testItem',
      authorId: 'authorid',
      title: 'Test Title',
      complete: false,
      skip: false,
    });

    expect(newItem).not.toBeNull();

    // Get the item by id
    const retrievedItem = await queues.getQueueById('testItem');
    expect(retrievedItem).toBeObject();
    expect(retrievedItem?.id).toEqual('testItem');
  });

  it('should update a queue item', async () => {
    const queues = new Queues();

    // Insert an item into the queue
    const newItem = await queues.insertQueue({
      id: 'updateItem',
      authorId: 'authorid',
      title: 'Test Title',
      complete: false,
      skip: false,
    });
    Logger.debug(newItem, 'updating queue item');
    expect(newItem).not.toBeNull();

    if(newItem !== null) {
      newItem.complete = true;
  
      // Update the item
      const updatedItem = await queues.updateQueue(newItem.id, newItem);
      expect(updatedItem).toBeObject();
      expect(updatedItem?.id).toEqual(newItem.id);
      expect(updatedItem?.complete).toEqual(true);
    } else {
      // TODO: whats better way to give real error?
      expect(1).toBe(2);
    }
  });

  it('should delete a queue item', async () => {
    const queues = new Queues();

    // Insert an item into the queue
    const newItem = await queues.insertQueue({
      id: 'deleteMe',
      authorId: 'authorid',
      title: 'Test Title',
      complete: false,
      skip: false,
    });

    expect(newItem).not.toBeNull();

    if(newItem !== null) {  
      // Delete the item
      const test = treaty(QueueEndpoints);
      const res = await test.queue({id: newItem.id}).delete();
      Logger.debug(res);
      expect(res.status).toBe(200);
      expect(res.data).toEqual("OK");
    } else {
      // TODO: whats better way to give real error?
      expect(1).toBe(2);
    }
  });
});