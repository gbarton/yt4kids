import { getDB } from '../../db/DB';
import Logger from '../Log';
import { AuthorsToThumbnailsInsert, AuthorsToThumbnailsTable, ThumbnailTable, VideosToThumbnailsTable, type ThumbnailInsert, type VideosToThumbnailInsert } from '../../db/schema';

export class Thumbnails {
  constructor() {}

  async insertThumbnails(thumbnails: ThumbnailInsert[], videoId?: string) {
    if (thumbnails.length == 0) {
      Logger.warn('passed zero thumbnails to save, skipping');
      return;
    }
    const db = await getDB();
    const inserts = await db.insert(ThumbnailTable).values(thumbnails).onConflictDoNothing().returning();
    if(inserts.length == 0) {
      Logger.info('already have thumbnails inserted');
      return;
    }
    Logger.debug(`inserted thumbnail`);

    // these are all for a video so lets populate the many to many table
    if(videoId) {
      const links : VideosToThumbnailInsert[] = inserts.map((t) => ({videoId, thumbnailId: t.id}))
      Logger.debug(links, `video links for ${thumbnails.length} thumbnails`);
      const linked = await db.insert(VideosToThumbnailsTable).values(links).onConflictDoNothing().returning();
      Logger.debug(`inserted ${linked.length} video->thumbnail relations`);
    } else {
      // these are author thumbnails so lets populate the many to many table
      const links : AuthorsToThumbnailsInsert[] = inserts.map((t) => ({authorId: t.authorId, thumbnailId: t.id}));
      Logger.debug(links, `author links for ${thumbnails.length} thumbnails`);
      const linked = await db.insert(AuthorsToThumbnailsTable).values(links).onConflictDoNothing().returning();
      Logger.debug(`inserted ${linked.length} author->thumbnail relations`);
    }
    return inserts;
  }
}
