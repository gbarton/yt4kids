import { IDB, QueryOptions, RecordTypes, YTAuthor, YTQueue, YTSearchResponse, YTThumbnail, YTVideoInfo } from "./Types";
import LokiDatabase from "./LokiDB";

let builtDb: IDB;

export default async function getDB(): Promise<IDB> {
  if(builtDb !== undefined) {
    return Promise.resolve(builtDb);
  }

  const dbType = process.env.YK_DB_TYPE || 'LOKI';
  // TODO: change to switch whenever I get a second db type
  builtDb = new LokiDatabase();
  await builtDb.init();
    
  return Promise.resolve(builtDb);
}

export async function addQueue(videoID: string, authorID: string, title: string): Promise<YTQueue> {
  const DB = await getDB();
  const q : YTQueue = {
    authorID,
    title,
    complete: false,
    requestedDate: new Date(),
    id: videoID,
    recordType: RecordTypes.DL_QUEUE
  }
  await DB.insertOrUpdateObj<YTQueue>(q);
  return q;
}

export async function getQueue(limit: number = 1): Promise<YTQueue[]> {
  const DB = await getDB();
  const results = await DB.find<YTQueue>(RecordTypes.DL_QUEUE, {
    limit,
    clause: { complete: false },
    sortBy: 'requestedDate',
    sortByDescending: true,
  });
  return results;
}

export async function getVideos(authorID?: string): Promise<YTSearchResponse> {
  const DB = await getDB();

  const qo: QueryOptions = {
    // custom sort function because you cant do nested props with simplesort
    sortFunction:  function(o1: any, o2: any) {
      return o1.meta?.created < o2.meta?.created? 1 : -1;
    }
  }

  if(authorID) {
    qo.clause = { authorID };
  }

  const results = await DB.find<YTVideoInfo>(RecordTypes.VIDEO, qo);

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