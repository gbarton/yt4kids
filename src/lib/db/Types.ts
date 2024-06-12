// EXTERNAL ONES FOR YT LIB

export enum MediaTypes {
  ALL = 'all',
  VIDEO = 'video',
  CHANNEL = 'channel',
  PLAYLIST = 'playlist',
  MOVIE = 'movie',
}

export enum UploadDate {
  ALL = 'all',
  HOUR = 'hour',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export type SearchOptions = {
  type?: MediaTypes,
  upload_date?: UploadDate,
  page: number,
}

// INTERNAL

/**
 * types of db records that we can use
 */
export enum RecordTypes {
  VIDEO = 'VIDEO',
  MUSIC = 'MUSIC',
  AUTHOR = 'AUTHOR',
  CHANNEL = 'CHANNEL',
  PLAYLIST = 'PLAYLIST',
  THUMBNAIL_FILE = 'THUMBNAIL_FILE',
  VIDEO_FILE = 'VIDEO_FILE',
  DL_QUEUE = 'DL_QUEUE',
};

export interface YTRecord {
  id: string,
  recordType: RecordTypes,
}

/**
 * dunno how I feel about this one
 */
export interface YTSearch {
  authorID?: string,
  search?: string,
  channelID?: string,
}

export interface YTQueue extends YTRecord {
  authorID: string,
  title: string,
  complete: boolean,
  requestedDate: Date,
}

export type YTThumbnail = {
  // id is the cleaned postfix of the src url
  id: string,
  url?: string,
  width: number,
  height: number,
  fileID?: string,
  // by width
  // 88, 176, 360, 720, ??
  size: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge',
}

/**
 * Used for videos and channels when content is deemed no good
 */
export interface YTBanned {
  date: Date,
  by: string,
  reason: string,
}

/**
 * used on videos and channels
 */
export interface YTAuthor extends YTRecord {
  name: string,
  url: string,
  thumbnails: YTThumbnail[],
}

/**
 * record that holds our channel information
 */
export interface YTChannelInfo extends YTRecord {
  name: string,
  authorID: string,
  videoIDs: string[],
  stayUpdated: boolean,
  banned?: YTBanned,
}

export interface YTFile extends YTRecord {
  fileExtention: string,
  filename: string,
  authorID: string,
  contentLength: number
}

export interface YTVideoInfo extends YTRecord {
  title: string,
  thumbnails: YTThumbnail[],
  authorID: string,
  durationText: string,
  durationSeconds: number,
  fileID?: string,
  quality?: string,
  format?: string,
  banned?: YTBanned,
}

export interface YTSearchResponse {
  query: string,
  channels: YTChannelInfo[],
  videos: YTVideoInfo[],
  authors: {[key: string]: YTAuthor},
}

// DATABASE STUFFS

export type QueryOptions = {
  clause?: Object,
  // does a keyword search for all values against the column
  keywords?: [{col: string, values: string[]}],
  sortBy?: string,
  sortByDescending?: boolean,
  sortFunction?: (o1: object, o2: object) => number
  limit?: number,
}

export interface IDB {
  shutdown(): void,
  init(adapterType?: string): Promise<any>,
  findOne<T extends YTRecord>(type: RecordTypes, id: string): Promise<T | null>,
  find<T extends YTRecord>(type: RecordTypes, options: QueryOptions): Promise<T[]>,
  insertOrUpdateObj<T extends YTRecord>(obj: T): Promise<void>,
}


