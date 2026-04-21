import { Elysia, t } from 'elysia'
import Logger from '../Log';
import { getDB } from '../../db/DB';
import { type YTSearch, YTSearchResponseSchema, YTSearchSchema } from '../db/Types';
import { existsSync, createReadStream, ReadStream } from 'node:fs';
import { type Author, AuthorTable, lower, ThumbnailTable, type VideoInsert, videoSchema, VideosToThumbnailsTable, VideoTable } from '../../db/schema';
import { and, desc, eq, isNotNull, like } from 'drizzle-orm';

export class Videos {
  constructor() {}

  async getVideoFile(id: string) {
    Logger.info(`file request for id ${id}`);
    const db = await getDB();
    const query = db.select({
      filename: VideoTable.filename,
      contentLength: VideoTable.contentLength,
      fileExtention: VideoTable.fileExtention,
    })
    .from(VideoTable).where(eq(VideoTable.id, id)).limit(1);
    Logger.debug(query.toSQL());

    const file = await query;
    return file.length == 1 ? file[0] : null;
  }

  async insertVideo(vid: VideoInsert) {
    const db = await getDB();
    const results = await db.insert(VideoTable)
      .values([vid])
      .onConflictDoNothing()
      .returning();
    
    return results.length == 1 ? results[0] : null;
  }

  async getVideo(id: string) {
    Logger.info(`video info request for id ${id}`);
    const db = await getDB();
    const query = db.select()
      .from(VideoTable)
      .where(eq(VideoTable.id, id)).limit(1);
    Logger.debug(query.toSQL());
    const video = await query;

    if (video.length == 0) {
      return null;
    }
    return video[0];
  }

  async getVideos(searchOpts: YTSearch) {
    const db = await getDB();

    let orderBy;
    switch (searchOpts.sort) {
      case 'oldest':
        orderBy = [VideoTable.createdAt];
        break;
      case 'author':
        orderBy = [AuthorTable.name, VideoTable.title];
        break;
      case 'title':
        orderBy = [VideoTable.title];
        break;
      case 'latest':
      default:
        orderBy = [desc(VideoTable.createdAt)];
        break;
    }

    let query = db.select().from(VideoTable)
      .fullJoin(AuthorTable, eq(VideoTable.authorId, AuthorTable.id))
      .where(
        and(
          searchOpts.authorId ? eq(VideoTable.authorId, searchOpts.authorId) : undefined,
          searchOpts.search? like(lower(VideoTable.title), `%${searchOpts.search.toLowerCase()}%`) : undefined
        )
      )
      .orderBy(...orderBy)
      .limit(searchOpts.limit)
      .offset(searchOpts.offset);

    
    Logger.debug(query.toSQL());
    const results = await query;

    const videos = results.map((r) => r.video).filter((v) => v != null);
    const authors : Record<string, Author> = {};
    results.forEach((r) => {
      if (r.author != null && !(r.author.id in authors)) {
        authors[r.author.id] = r.author;
      }
    });
    // const authors : Author[] = [];

    // results
    // .forEach((r) => {
    //   if (r.author != null && !authors.some((author) => author.name === r.author?.name)) { // Check if the author is already in the array
    //     authors.push(r.author); // Add the author to the array
    //   }
    // });
  
    // authors.sort((a, b) => a.name.localeCompare(b.name)); // Sort authors by name

    return {
      query: searchOpts.search || "",
      // channels: [],
      videos: videos,
      authors,
    };
  }

  // grab all the thumbnails that have a fileId and sort by the largest
  async getBestThumbnailForVideo(id: string) {
    const db = await getDB();
    const query = db.select({
        filename: ThumbnailTable.filename,
        url: ThumbnailTable.url,
        contentLength: ThumbnailTable.contentLength,
      }).from(ThumbnailTable)
      .leftJoin(VideosToThumbnailsTable, eq(ThumbnailTable.id, VideosToThumbnailsTable.thumbnailId))
      .where(
        and(
          eq(VideosToThumbnailsTable.videoId, id),
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

  // async getThumbnailFileInfo(id: string) {
  //   const db = await getDB();
  //   const query = db.select()
  //     .from(ThumbnailTable)
  //     .fullJoin(FileTable, eq(ThumbnailTable.fileId, FileTable.id))
  //     .where(eq(ThumbnailTable.id, id)).limit(1);
  //   Logger.debug(query.toSQL());
  //   const results = await query;
  //   if (results.length == 1 && results[0].file != null) {
  //     return results[0].file;
  //   }
  //   return null;
  // }
}

const contentType: {[key: string]: string} = {
  "mp4": "video/mp4",
  "webm": "video/webm",
}

export const VideoEndpoints = new Elysia({ prefix: '/videos' })
  .decorate('videos', new Videos())
  .get('/search', ({videos, query}) => {
    return videos.getVideos(query);
  }, {
    detail: {
      description: "Search downloaded videos, all fields optional. search field will search the titles",
    },
    query: YTSearchSchema,
    response: YTSearchResponseSchema,
  })
  .get('/:id', async ({error, params: { id }, videos}) =>  {
    const info = await videos.getVideo(id);
    if (info === null) {
      return error(400, 'video not found');
    }
    return info;
  }, {
    detail: {
      description: "Retrieve video info for a given id",
    },
    params: t.Object({id: t.String()}),
    response: {
      200: videoSchema,
      400: t.String(),
    }
    // response: YTVideoInfoSchema,
  })
  .get('/:id/chunk', async ({error, set, videos, headers, params: { id }}) => {
    Logger.info(`request for video chunk id ${id}`);
    const record = await videos.getVideoFile(id);
    // log.info(record, 'video requested');
    if (!record || record === undefined) {
      return error(400, 'video meta not found');
    }
    if (!record?.filename || !record?.contentLength || !record?.fileExtention) {
      return error(400, 'video file not found');
    }
    if (!existsSync(record.filename)) {
      return error(400, 'video not found');
    }
  
    const range = headers.range;
    const fileSize = record.contentLength;
    const path = record.filename;
  
    let stream: ReadStream;
    let headerCode = 200;
  
    // found here
    // https://stackoverflow.com/questions/4360060/video-streaming-with-html-5-via-node-js
  
    if (range) {
      Logger.info(`range header found!: ${range}`);
      const parts = range.replace(/bytes=/, "").split("-");
      // we use this when there isnt a limit in the range
      const chunkLimit = 20 * 1048576;
      const start = parseInt(parts[0], 10);
      // we will use the range if present
      // we will cap the chunk at 20MB or the end of the file if
      // its under 20MB away
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : Math.min(start + chunkLimit, fileSize - 1);
      const chunksize = (end - start) + 1;
      const responseRange = `bytes ${start}-${end}/${fileSize}`;
      Logger.info(`range set to '${responseRange}'`);
      stream = createReadStream(path, {start, end});

      set.headers['Content-Range'] = responseRange;
      set.headers['Accept-Ranges'] = 'bytes';
      set.headers['Content-Length'] = `${chunksize}`,
      set.headers['Content-Type'] = contentType[record.fileExtention],
      // ? do I need this?
      // set.headers['Content-Disposition'] = ContentDisposition(path),
      // headers = {
      //   'Content-Range': responseRange,
      //   'Accept-Ranges': 'bytes',
      //   // 'Content-Length': fileSize, // doesnt work
      //   // 'X-Content-Type-Options': 'nosniff',  // no effect
      //   'Content-Length': chunksize,
      //   'Content-Type': contentType[record.fileExtention],
      //   'Content-Disposition': ContentDisposition(path),
      // }
      headerCode = 206;
    } else {
      stream = createReadStream(path);
      set.headers['Accept-Ranges'] = 'bytes';
      set.headers['Content-Length'] = `${fileSize}`;
      set.headers['Content-Type'] = contentType[record.fileExtention] || 'video/mp4';
      // ? do I need this?
      // set.headers['Content-Disposition'] = ContentDisposition(path),
      // headers = {
      //   'Content-Length': fileSize,
      //   'Content-Type': 'video/mp4',
      //   'Content-Disposition': ContentDisposition(path),
      // }
    }
    
    // res.writeHead(headerCode, headers);
    set.status = headerCode;
    return stream;
  }, {
    params: t.Object({id: t.String()})
  })
  .get('/:id/thumbnail', async ({set, videos, params: { id }}) => {
    const fileInfo = await videos.getBestThumbnailForVideo(id);
    if (!fileInfo || fileInfo === undefined) {
      Logger.warn(`could not find the thumbnail file for video ${id}`);
      set.status = 404;
      return 'thumbnail not found';
    }

    const file = Bun.file(fileInfo.filename);
    if (!file.exists()) {
      Logger.warn(`missing thumbnail for video ${id} at: ${fileInfo.filename}`);
      set.status = 404;
      return 'thumbnail file missing';
    }

    set.headers['Content-Length'] = `${fileInfo.contentLength}`;
    set.headers['Content-Type'] = 'image/jpeg';

    return file;
  }, {
    params: t.Object({id: t.String()}),
  });