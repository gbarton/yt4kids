// yt4kids/server/src/lib/routes/Queue.ts
import { Elysia, t } from 'elysia';
import Logger from '../Log';
import { type QueueInsert, queueInsertSchema, queueSchema, QueueTable } from '../../db/schema';
import { getDB } from '../../db/DB';
import { and, asc, desc, eq } from 'drizzle-orm';

export class Queues {
  constructor() {}

  public async insertQueue(queueItem: QueueInsert) {
    Logger.debug(`saving new queue item ${queueItem.id}`);
    const db = await getDB();
    const result = await db.insert(QueueTable)
      .values([queueItem])
      .onConflictDoNothing().returning();

    // we dont update when the id is the same, so return null
    if (result.length == 0) {
      return null;
    }

    return result[0];
  }

  public async getQueue() {
    const db = await getDB();
    const results = await db.select().from(QueueTable)
      .orderBy(desc(QueueTable.requestedDate));
    
    return results;
  }

  public async getQueueById(id: string) {
    const db = await getDB();
    const result = await db.select().from(QueueTable).where(eq(QueueTable.id, id)).limit(1);
    
    if (result.length === 1) {
      return result[0];
    }
    return null;
  }

  public async getNextInQueue() {
    const db = await getDB();
    const results = await db.select()
      .from(QueueTable)
      .where(
        and(
          eq(QueueTable.skip, false),
          eq(QueueTable.complete, false)
        )
      )
      .orderBy(asc(QueueTable.requestedDate))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  public async updateQueue(id: string, updatedQueueItem: QueueInsert) {
    Logger.debug(`updating queue item ${id}`);
    const db = await getDB();
    const result = await db.update(QueueTable)
      .set(updatedQueueItem)
      .where(eq(QueueTable.id, id))
      .returning();

    if (result.length === 1) {
      return result[0];
    }
    return null;
  }

  public async skip(id: string) {
    Logger.debug(`skipping queue item ${id}`);
    const record = await this.getQueueById(id);
    if (record == null) {
      return null;
    }
    record.skip = !record.skip;
    if (!record.skip) {
      record.attempts = 0;
    }
    return this.updateQueue(id, record);
  }

  public async deleteQueue(id: string) {
    Logger.debug(`deleting queue item ${id}`);
    const db = await getDB();
    const result = await db.delete(QueueTable)
      .where(eq(QueueTable.id, id))
      .returning();

    if (result.length === 1) {
      return result[0];
    }
    return null;
  }
}

export const QueueEndpoints = new Elysia({ prefix: '/queue' })
  .decorate('queue', new Queues())
  .get('', async ({ queue }) => {
    return queue.getQueue();
  })
  .post('', async ({ error, body, queue }) => {
    try {
      const newQueueItem = await queue.insertQueue(body);
      if (newQueueItem == null) {
        return error(400, 'id already exists, update instead');
      }
      return { id: newQueueItem.id };
    } catch (err) {
      Logger.error(err);
      return error(400, 'Error inserting queue item');
    }
  }, {
    body: queueInsertSchema,
    response: {
      200: t.Object({
        id: t.String(),
      }),
      400: t.String(),
    }
  })
  .get('/:id', async ({ error, params: { id }, queue }) => {
    const queueItem = await queue.getQueueById(id);
    if (queueItem == null) {
      return error(400, 'queue item not found');
    }
    return queueItem;
  }, {
    params: t.Object({ id: t.String() }),
  })
  .put('/:id', async ({ error, body, params: { id }, queue }) => {
    try {
      const updatedQueueItem = await queue.updateQueue(id, body);
      if (updatedQueueItem == null) {
        return error(400, 'queue item not found');
      }
      return updatedQueueItem;
    } catch (err) {
      return error(400, 'Error updating queue item');
    }
  }, {
    params: t.Object({ id: t.String()}),
    body: queueInsertSchema,
    response: {
      200: queueSchema,
      400: t.String(),
    }
  })
  .put('/:id/skip', async ({ error, params: { id }, queue }) => {
    try {
      const record = await queue.skip(id);
      if (record == null) {
        return error(400, 'queue item not found');
       }
       return record;
    } catch (err) {
      return error(400, 'Error updating queue item');
    } 
  }, {
    params: t.Object({ id: t.String(), title: t.String() }),
    response: {
      200: queueSchema,
      400: t.String(),
    }
  })
  .delete('/:id', async ({ error, params: { id }, queue }) => {
    try {
      const deletedQueueItem = await queue.deleteQueue(id);
      if (deletedQueueItem == null) {
        return error(400, 'queue item not found');
      }
      return "OK";
    } catch (err) {
      return error(400, 'Error deleting queue item');
    }
  }, {
    params: t.Object({ id: t.String() }),
    response: {
      200: t.String(),
      400: t.String(),
    }
  });