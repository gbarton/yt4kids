import { t } from 'elysia';

// EXTERNAL ONES FOR YT LIB

export enum MediaTypes {
  ALL = 'all',
  VIDEO = 'video',
  CHANNEL = 'channel',
  PLAYLIST = 'playlist',
  MOVIE = 'movie',
}

export const MediaTypesSchema = t.Enum(MediaTypes);

export enum UploadDate {
  ALL = 'all',
  HOUR = 'hour',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export const UploadDateSchema = t.Enum(UploadDate);

export const SearchOptionsSchema = t.Object({
  type: t.Optional(MediaTypesSchema),
  upload_date: t.Optional(UploadDateSchema),
  page: t.Number(),
})

export type SearchOptions = typeof SearchOptionsSchema.static;

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
  USER_PROFILE = "USER_PROFILE",
  USER_PWHASH = "USER_PWHASH",
};

// this ones generated from the enum for a change
export const RecordTypesSchema = t.Enum(RecordTypes);

const YTRecordSchema = t.Object({
  id: t.String(),
  recordType: RecordTypesSchema,
});

export type YTRecord = typeof YTRecordSchema.static;


export const YTSearchSchema = t.Object({
  authorID: t.Optional(t.String()),
  search: t.Optional(t.String()),
  channelID: t.Optional(t.String()),
  limit: t.Optional(t.Number({minimum: 0, maximum: 50})),
  offset: t.Optional(t.Number({minimum: 0}))
});

export type YTSearch = typeof YTSearchSchema.static;


/**
 * User management
 */
export interface YTProfile extends YTRecord {
  displayName: string,
  email: string,
  admin: boolean,
}

export interface YTPassword extends YTRecord {
  pwHash: string
}

export interface YTQueue extends YTRecord {
  authorID: string,
  title: string,
  complete: boolean,
  requestedDate: Date,
  attempts: number,
  skip: boolean,
}

export const YTThumbnailSchema = t.Object({
  id: t.String(),
  url: t.Optional(t.String()),
  width: t.Number(),
  height: t.Number(),
  fileID: t.Optional(t.String()),
  size: t.Union([t.Literal('tiny'),t.Literal('small'),t.Literal('medium'),t.Literal('large'),t.Literal('xlarge')])
});

export type YTThumbnail = typeof YTThumbnailSchema.static;

export const YTBannedSchema = t.Object({
  date: t.Date(),
  by: t.String(),
  reason: t.String(),
});

/**
 * Used for videos and channels when content is deemed no good
 */
export type YTBanned = typeof YTBannedSchema;


/**
 * used on videos and channels
 */
export const YTAuthorSchema = t.Composite([
  YTRecordSchema,
  t.Object({
    name: t.String(),
    url: t.String(),
    thumbnails: t.Array(YTThumbnailSchema),
  })
])

export type YTAuthor = typeof YTAuthorSchema.static;

export const YTChannelInfoSchema = t.Composite([
  YTRecordSchema,
  t.Object({
    name: t.String(),
    authorID: t.String(),
    videoIDs: t.Array(t.String()),
    stayUpdated: t.Boolean({ default: false}),
    banned: t.Optional(YTBannedSchema),
  })
])

/**
 * record that holds our channel information
 */
export type YTChannelInfo = typeof YTChannelInfoSchema.static;


export const YTFileSchema = t.Composite([
  YTRecordSchema,
  t.Object({
    fileExtention: t.String(),
    filename: t.String(),
    authorID: t.String(),
    contentLength: t.Number(),
  })
])

export type YTFile = typeof YTFileSchema.static;

export const YTVideoInfoSchema = t.Composite([
  YTRecordSchema,
  t.Object({
    title: t.String(),
    thumbnails: t.Array(YTThumbnailSchema),
    authorID: t.String(),
    durationText: t.String(),
    durationSeconds: t.Number(),
    fileID: t.Optional(t.String()),
    quality: t.Optional(t.String()),
    format: t.Optional(t.String()),
    banned: t.Optional(YTBannedSchema),
  })
])

export type YTVideoInfo = typeof YTVideoInfoSchema.static;

export const YTSearchResponseSchema = t.Object({
  query: t.String(),
  channels: t.Array(YTChannelInfoSchema),
  videos: t.Array(YTVideoInfoSchema),
  authors: t.Record(t.String(), YTAuthorSchema),
})

export type YTSearchResponse = typeof YTSearchResponseSchema.static;


// DATABASE STUFFS

export type QueryOptions = {
  clause?: Object,
  // does a keyword search for all values against the column
  keywords?: [{col: string, values: string[]}],
  sortBy?: string,
  sortByDescending?: boolean,
  sortFunction?: (o1: object, o2: object) => number
  limit?: number,
  offset?: number,
}

export interface IDB {
  shutdown(): void,
  init(adapterType?: string): Promise<any>,
  findOne<T extends YTRecord>(type: RecordTypes, id: string): Promise<T | null>,
  find<T extends YTRecord>(type: RecordTypes, options: QueryOptions): Promise<T[]>,
  insertOrUpdateObj<T extends YTRecord>(obj: T): Promise<void>,
  delete<T extends YTRecord>(obj: T): Promise<boolean>,
}


