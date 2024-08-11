export enum RecordTypes {
  VIDEO = 'VIDEO',
  MUSIC = 'MUSIC',
  AUTHOR = 'AUTHOR',
  CHANNEL = 'CHANNEL',
  PLAYLIST = 'PLAYLIST',
  THUMBNAIL_FILE = 'THUMBNAIL_FILE',
  VIDEO_FILE = 'VIDEO_FILE'
};

export interface YTRecord {
  id: string,
  recordType: RecordTypes,
}

export interface YTQueue extends YTRecord {
  authorID: string,
  title: string,
  complete: boolean,
  requestedDate: Date,
  attempts: number,
  skip: boolean,
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
}

export interface YTSearchResponse {
  query: string,
  channels: YTChannelInfo[],
  videos: YTVideoInfo[],
  authors: {[key: string]: YTAuthor},
}