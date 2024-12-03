import { IDB, QueryOptions, RecordTypes, YTAuthor, YTProfile, YTQueue, YTSearch, YTSearchResponse, YTThumbnail, YTVideoInfo } from './Types';
import LokiDatabase from "./LokiDB";
import log from '../Log';

let builtDb: IDB;

// TODO: this DB abstraction was a good idea but still
// TODO: leaks lokidb query structure :(

export default async function getDB(): Promise<IDB> {
  if(builtDb !== undefined) {
    return Promise.resolve(builtDb);
  }

  const dbType = Bun.env.YK_DB_TYPE || 'LOKI';
  // TODO: change to switch whenever I get a second db type
  builtDb = new LokiDatabase();
  await builtDb.init();
    
  return Promise.resolve(builtDb);
}

// export async function getUser(email: string): Promise<YTProfile | null> {
//   const DB = await getDB();
//   return DB.findOne<YTProfile>(RecordTypes.USER_PROFILE, email);
// }

// export async function addQueue(videoID: string, authorID: string, title: string): Promise<YTQueue> {
//   const DB = await getDB();
//   const q : YTQueue = {
//     authorID,
//     title,
//     complete: false,
//     requestedDate: new Date(),
//     attempts: 0,
//     skip: false,
//     id: videoID,
//     recordType: RecordTypes.DL_QUEUE
//   }
//   await DB.insertOrUpdateObj<YTQueue>(q);
//   return q;
// }

export async function getQueued(limit: number = 1): Promise<YTQueue[]> {
  const DB = await getDB();
  const results = await DB.find<YTQueue>(RecordTypes.DL_QUEUE, {
    limit,
    clause: { complete: false, skip: false },
    sortBy: 'requestedDate',
    sortByDescending: true,
  });
  return results;
}

export async function getVideos(searchOpts: YTSearch): Promise<YTSearchResponse> {
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
  log.info(`video search found ${results.length} videos`);

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