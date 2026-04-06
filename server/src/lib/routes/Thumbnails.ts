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
    Logger.debug(`inserted ${inserts.length} of ${thumbnails.length} thumbnails`);

    // Always create the many-to-many links, even if thumbnails already existed
    if(videoId) {
      // Use the original thumbnail IDs (they're the same whether newly inserted or pre-existing)
      const links : VideosToThumbnailInsert[] = thumbnails.map((t) => ({videoId, thumbnailId: t.id}))
      Logger.debug(links, `video links for ${thumbnails.length} thumbnails`);
      const linked = await db.insert(VideosToThumbnailsTable).values(links).onConflictDoNothing().returning();
      Logger.debug(`inserted ${linked.length} video->thumbnail relations`);
    } else {
      const links : AuthorsToThumbnailsInsert[] = thumbnails.map((t) => ({authorId: t.authorId, thumbnailId: t.id}));
      Logger.debug(links, `author links for ${thumbnails.length} thumbnails`);
      const linked = await db.insert(AuthorsToThumbnailsTable).values(links).onConflictDoNothing().returning();
      Logger.debug(`inserted ${linked.length} author->thumbnail relations`);
    }
    return inserts;
  }
}
