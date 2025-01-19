import { Elysia, t } from 'elysia'
import Logger from '../Log';
import getDB from '../db/DB';
import { QueryOptions, RecordTypes, YTAuthor, YTFile, YTSearch, YTSearchResponse, YTSearchResponseSchema, YTSearchSchema, YTVideoInfo, YTVideoInfoSchema } from '../db/Types';
import { existsSync, createReadStream, ReadStream } from 'node:fs';

class Videos {
  constructor() {}

  async getVideoFile(id: string) {
    Logger.info(`file request for id ${id}`);
    const DB = await getDB();
    return DB.findOne<YTFile>(RecordTypes.VIDEO_FILE, id);
  }

  async getVideo(id: string) {
    Logger.info(`video info request for id ${id}`);
    const DB = await getDB();
    return DB.findOne<YTVideoInfo>(RecordTypes.VIDEO, id);
  }

  async getVideos(searchOpts: YTSearch): Promise<YTSearchResponse> {
    const DB = await getDB();
  
    const qo: QueryOptions = {
      // custom sort function because you cant do nested props with simplesort
      sortFunction:  function(o1: any, o2: any) {
        return o1.meta?.created < o2.meta?.created? 1 : -1;
      }
    }
  
    if(searchOpts.authorID) {
      qo.clause = { authorID: searchOpts.authorID };
    }
  
    if(searchOpts.search) {
      qo.keywords = [{col: "title", values: searchOpts.search.split(" ")}]
    }
  
    const results = await DB.find<YTVideoInfo>(RecordTypes.VIDEO, qo);
    Logger.info(`video search found ${results.length} videos`);
  
    const authors: {[key: string]: YTAuthor} = {};
    // resolve all the authors (unique the id's first)
    const promises = [... new Set(results.map((v) => v.authorID))]
      .map((id): Promise<YTAuthor> => {
        return new Promise(async (resolve, reject) => {
          const author = await DB.findOne<YTAuthor>(RecordTypes.AUTHOR, id);
          if (author !== null) {
            authors[id] = author;
            return resolve(author);
          }
        });
      });
    await Promise.all(promises);
    
    return {
      query: "",
      channels: [],
      videos: results,
      authors,
    };
  }

  async getThumbnail(id: string) {
    const DB = await getDB();
    return DB.findOne<YTFile>(RecordTypes.THUMBNAIL_FILE, id);
  }
}

const contentType: {[key: string]: string} = {
  "mp4": "video/mp4",
}

export const VideoEndpoints = new Elysia({ prefix: '/videos' })
  .decorate('videos', new Videos())
  .get('/search', ({videos, query}) => {
    return videos.getVideos(query);
  }, {
    query: YTSearchSchema,
    response: YTSearchResponseSchema,
  })
  .get('/info/:id', async ({error, params: { id }, videos}) =>  {
    const info = videos.getVideo(id);
    if (info == null) {
      return error(400, 'video not found');
    }
    return info;
  }, {
    params: t.Object({id: t.String()}),
    // response: YTVideoInfoSchema,
  })
  .get('/chunk/:id', async ({error, set, videos, headers, params: { id }}) => {
    Logger.info(`request for video chunk id ${id}`);
    const record = await videos.getVideoFile(id);
    // log.info(record, 'video requested');
    if (!record || record === undefined) {
      return error(400, 'video meta not found');
    }
    if (!record?.filename) {
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
      const chunkLimit = 10 * 1048576;
      const start = parseInt(parts[0], 10);
      // we will use the range if present
      // we will cap the chunk at 10MB or the end of the file if
      // its under 10MB away
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
      set.headers['Content-Length'] = `${fileSize}`;
      set.headers['Content-Type'] = 'video/mp4';
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
  .get('/thumbnail/:id', async ({error, set, videos, params: { id }}) => {
    const fileInfo =  await videos.getThumbnail(id);
    if (!fileInfo || fileInfo === undefined) {
      Logger.warn(`could not find the thumbnail file`);
      return error(400, 'file meta not found');
    }
  
    const file = Bun.file(fileInfo.filename);
    const stream = file.stream();

    set.headers['Content-Length'] = `${fileInfo.contentLength}`;
    set.headers['Content-Type'] = 'image/jpg';
    
    return stream;
  }, {
    params: t.Object({id: t.String()}),

  });