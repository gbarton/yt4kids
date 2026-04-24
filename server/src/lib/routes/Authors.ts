import { Elysia, t } from 'elysia';
import Logger from '../Log';
import { type AuthorInsert, authorInsertSchema, AuthorsToThumbnailsTable, AuthorTable, ThumbnailTable, VideoTable } from '../../db/schema';
import { getDB } from '../../db/DB';
import { and, asc, desc, eq, exists, isNotNull, like } from 'drizzle-orm';

export class Authors {
  constructor() {}

  public async insertAuthor(author: AuthorInsert) {
    Logger.debug(`saving new author ${author.id}`);
    const db = await getDB();
    const auth = await db.insert(AuthorTable)
      .values([author])
      .onConflictDoNothing().returning();
    return auth[0];
  }

  public async getAuthors(query: string | null, limit: number, offset: number, withVideosOnly: boolean = false) {
    const db = await getDB();
    const results = await db.select()
    .from(AuthorTable)
    .where(
      and(
        query !== null ? like(AuthorTable.name, `%${query}%`) : undefined,
        withVideosOnly ? exists(
          db.select().from(VideoTable).where(eq(VideoTable.authorId, AuthorTable.id))
        ) : undefined
      )
    )
    .orderBy(asc(AuthorTable.name))
    .limit(limit)
    .offset(offset);
    
    return results;
  }

  public async getAuthor(id: string) {
    const db = await getDB();
    const result = await db.select().from(AuthorTable)
      .where(eq(AuthorTable.id, id)).limit(1);
    
    if (result.length === 1) {
      return result[0];
    }
    return null;
  }

  public async getBestThumbnailForAuthor(id: string) {
    const db = await getDB();
    const query = db.select({
        filename: ThumbnailTable.filename,
        url: ThumbnailTable.url,
        contentLength: ThumbnailTable.contentLength,
      }).from(ThumbnailTable)
      .leftJoin(AuthorsToThumbnailsTable, eq(ThumbnailTable.id, AuthorsToThumbnailsTable.thumbnailId))
      .where(
        and(
          eq(AuthorsToThumbnailsTable.authorId, id),
          isNotNull(ThumbnailTable.filename)
        )
      )
      .orderBy(desc(ThumbnailTable.width));
    Logger.debug(query.toSQL());
    const results = await query;

    if (results.length == 0) {
      return null;
    }

    return results[0];
  }
}

export const AuthorsEndpoints = new Elysia({ prefix: '/authors' })
  .decorate('authors', new Authors())
  .get('', async ({ authors, query: {query, limit, offset, withVideosOnly} }) => {
    const arr = await authors.getAuthors(query || null, limit, offset, withVideosOnly);
    return {
      query,
      authors : arr ? arr : [],
    };
  }, {
    query: t.Object({
      query: t.Optional(t.String()),
      offset: t.Integer({default:0}),
      limit: t.Integer({default:20}),
      withVideosOnly: t.Optional(t.Boolean({default: false}))
    }),
  })
  .post('', async ({ authors, body }) => {
    const author = await authors.insertAuthor(body);
    return author;
   }, {
    body: authorInsertSchema,
  })
  .get('/:id', async ({ error, params: { id }, authors }) => {
    const info = await authors.getAuthor(id);
    if (info == null) {
      return error(400, 'author not found');
    }
    return info;
  }, {
    params: t.Object({ id: t.String() }),
  })
  .get('/:id/thumbnail', async ({set, authors, params: { id }}) => {
    const fileInfo =  await authors.getBestThumbnailForAuthor(id);
    if (!fileInfo || fileInfo === undefined) {
      Logger.warn(`could not find the thumbnail file for author ${id}`);
      set.status = 404;
      return 'thumbnail not found';
    }

    const file = Bun.file(fileInfo.filename);
    set.headers['Content-Length'] = `${fileInfo.contentLength}`;
    set.headers['Content-Type'] = 'image/jpeg';

    return file;
  }, {
    params: t.Object({id: t.String()}),
  });
