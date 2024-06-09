import log from "../log/Logger";

// TODO: stop using sync!
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { rename, rm } from 'node:fs/promises';
import { Innertube, Utils as YTTools } from 'youtubei.js';
import * as Utils from '../utils/Utils';
import getDB from "../db/DB";

import { RecordTypes, SearchOptions, YTAuthor, YTChannelInfo, YTFile, YTQueue, YTSearchResponse, YTThumbnail, YTVideoInfo } from "../db/Types";

import crypto from 'crypto';
import cp from 'child_process';
import ffmpegPath  from 'ffmpeg-static';
import { DownloadOptions } from "youtubei.js/dist/src/types";
import { VideoInfo } from "youtubei.js/dist/src/parser/youtube";
import { Author, Format, Thumbnail } from "youtubei.js/dist/src/parser/misc";
import { Video } from "youtubei.js/dist/src/parser/nodes";
import { Readable } from "stream";

log.info(ffmpegPath, "FFMPEG path");

let initialized = false;
let yt : Innertube;


async function getYT(): Promise<Innertube> {
  // TODO: support testing by returning a mock one
  if (Utils.isNull(yt) || initialized === false) {
    yt = await Innertube.create({/* options */});
  }
  return yt;
}

function getStorageDir(): string {
  const sDir = process.env.YK_STORAGE_DIR || './storage';
  if (!existsSync(sDir)) {
    mkdirSync(sDir);
    log.info('storage directory created');
  }
  return sDir;
}

/**
 * For debugging, the full record is huge
 */
function printAdaptiveFormat(f: any) {
  return {
    has_audio: f.has_audio,
    has_video: f.has_video,
    mime_type: f.mime_type,
    quality_label: f.quality_label,
    width: f.width,
    content_length: f.content_length,
    bitrate: f.bitrate,
    approx_duration_ms: f.approx_duration_ms,
    language: f.language,
    is_origional: f.is_origional,
    has_text: f.has_text,
  }
}
// stuff to rip out of a string
const forbiddenCharsString = ['}', '{', '%', '>', '<', '^', ';', '`', '$', '"', "@", '='];

function cleanString(str: string) {
  let s = str;
  for (const i in forbiddenCharsString) {
    s = s.replaceAll(forbiddenCharsString[i], '')
  }
  return s.replaceAll("/", "__");
}

function fileSafeStr(s: string) {
  return cleanString(s).replaceAll(/[\s.]/g, '_');
}

function makeDir(type: RecordTypes, authorId: string): string {
  let dir = `${getStorageDir()}/${type}/${fileSafeStr(authorId)}`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true});
    log.info(`created new directory ${dir}`);
  }
  return dir;
}

function thumbnailStoragePath(authorId: string, id: string, fileExtention: string = 'jpeg') {
  const dir = makeDir(RecordTypes.THUMBNAIL_FILE, authorId);
  return `${dir}/${fileSafeStr(id)}.${fileExtention}`;
}

function videoStoragePath(authorId: string, title: string, fileExtention: string = 'mp4'): string {
  const dir = makeDir(RecordTypes.VIDEO_FILE, authorId);
  return `${dir}/${fileSafeStr(title.trim())}.${fileExtention}`;
}

/**
 * 
 * @param ext used to create tmp filenames while we download videos
 * @returns 
 */
function tmpFilePath(ext?: string) {
  const tmpDir = `${getStorageDir()}/tmp`;
  if(!existsSync(tmpDir)) {
    mkdirSync(tmpDir);
  }
  let path = `${tmpDir}/${crypto.randomBytes(16).toString('hex')}`;
  if (!ext){
    return path;
  }
  return `${path}.${ext}`;
}

function getFilesizeInBytes(filename: string) {
  var stats = statSync(filename);
  return stats.size;
}

type dlType = 'video' | 'audio' | 'video+audio';

type DLExtraOpts = {
  contentLength: number,
}

type DLOpts = DownloadOptions & DLExtraOpts;

/**
 * Downloads a given yt video with the authorID
 * (cause the yt call doesnt seem to have author data!?)
 * @param id yt id of the video (what you see in the url)
 * @param dlObj options to send to innertube
 * @param path where to store the file
 */
async function download(id: string, dlObj: DLOpts, path: string) {
  log.info(dlObj, "Download Options");
  const yt = await getYT();
  const stream = await yt.download(id, dlObj);

  const file = createWriteStream(path);
  let chunks = 0;
  let percent = 0;
  const total = dlObj.contentLength;

  // need to wait on the write to ensure the file is completely ready
  for await (const chunk of YTTools.streamToIterable(stream)) {
    const p = new Promise((resolve, reject) => {
      file.write(chunk, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(path);
      });
    });
    await p;
    chunks += chunk.length;
    if (Math.round(chunks / total * 100) >= percent + 10.0) {
      percent = Math.round(chunks / total * 100);
      log.info(`${percent}% (${chunks}/${total})`);
    }
  }
  
  percent = Math.round(chunks / total * 100);
  log.info(`${percent}% ${path} chunks written ${chunks}/${total}`);
  file.end();
  // file.close();

  log.info(`bytes on disk: ${getFilesizeInBytes(path)}/${total}`)
}

/**
 * Download thumbnails for a given author
 * @param authorID id of who we are saving
 * @param tns thumbnails
 * @returns 
 */
async function saveThumbnails(authorID: string, tns: Thumbnail[]): Promise<YTThumbnail[]> {
  // pull down thumbnails
  // TODO: need to do some retry logic
  const promises = tns.map((t):Promise<YTThumbnail> => new Promise(async (resolve, reject) => {
    // some of yt's urls dont have http/https and just start at //
    const urlStr = t.url.startsWith('//') ? `http:${t.url}` : t.url;
    const imgRes = await fetch(urlStr);
    if (!imgRes.ok || imgRes.body === null) {
      log.warn(imgRes.status, `unable to fetch url: ${urlStr}`);
      return reject(`fetch failed for url: ${urlStr}`);
    }
    const url = new URL(urlStr);
    const fileId = cleanString(url.pathname);
    const fileName = thumbnailStoragePath(authorID, fileId);
    const stream = createWriteStream(fileName);
    // setup listeners
    const p = new Promise((resolve, reject) => {
      stream.on('end', () => {
        log.info('thumbnail end');
        resolve(fileName);
      });
      stream.on('close', () => {
        log.info('thumbnail close');
        resolve(fileName);
      });
      stream.on('error', (err) => {
        log.error(err);
        log.error(`broke streaming thumbnail: ${urlStr}`);
        reject(fileName);
      });
    })
    // write the file
    Readable.fromWeb(imgRes.body).pipe(stream);
    await p;
    const contentLength = getFilesizeInBytes(fileName);
    log.info(`thumbnail saved to file ${fileName}`);

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const tFile : YTFile = {
      fileExtention: contentType?.substring(contentType.indexOf('/') + 1),
      filename: fileName,
      authorID: authorID,
      contentLength,
      id: fileId,
      recordType: RecordTypes.THUMBNAIL_FILE,
    }
    // log.info(tFile);
    const DB = await getDB();
  
    // save file record
    await DB.insertOrUpdateObj(tFile);
    log.info('saved file record');
    // return thumbnail record
    const tn: YTThumbnail = {
      id: fileId,
      fileID: fileId,
      width: t.width,
      height: t.height,
      size: widthToSize(t.width),
    }
    resolve(tn);
  }));

  // save all thumbnails
  const ts = await Promise.all(promises).catch((err) => { log.error("issue saving thumbnails"); return []});
  log.info('all thumbnails saved');
  return ts;
}

type CodecDetails = {
  codec: string,
  aCodec: string,
  fileExtention: string,
  ffmpegArgs: string[],
}

type Codecs = {
  [key: string] : CodecDetails,
}

export async function downloadYTVideo(videoID: string, authorID: string) {
  const yt = await getYT();
  // inspired from
  // https://github.com/imputnet/cobalt/blob/current/src/modules/processing/services/youtube.js
  let format = "h264";
  const codecMatch: Codecs = {
    h264: {
        codec: "avc1",
        aCodec: "mp4a",
        fileExtention: "mp4",
        ffmpegArgs: ["-c:v", "copy", "-c:a", "copy", "-movflags", "faststart+frag_keyframe+empty_moov"],
    },
    av1: {
        codec: "av01",
        aCodec: "mp4a",
        fileExtention: "mp4",
        ffmpegArgs: ["-c:v", "copy", "-c:a", "copy", "-movflags", "faststart+frag_keyframe+empty_moov"],
    },
    vp9: {
        codec: "vp9",
        aCodec: "opus",
        fileExtention: "webm",
        ffmpegArgs: ["-c:v", "copy", "-c:a", "copy"],
    }
  }

  let info : VideoInfo;
  try {
    log.info('retrieving video info');
    info = await yt.getBasicInfo(videoID, 'WEB');
    log.info("info retrieved");

  } catch (error) {
    log.error(error);
    return { error: 'Error Info for video was no good' };
  }

  // TODO: sort out errors
  if (!info || info === null)
    return { error: 'ErrorCantConnectToServiceAPI' };

  if (info.playability_status.status !== 'OK') return { error: 'ErrorYTUnavailable' };
  if (info.basic_info.is_live) return { error: 'ErrorLiveVideo' };

  // return a critical error if returned video is "Video Not Available"
  // or a similar stub by youtube
  if (info.basic_info.id !== videoID) {
      return {
          error: 'ErrorCantConnectToServiceAPI',
          critical: true
      }
  }

  if (info.streaming_data == null) {
    return { error: "missing streaming info"};
  }
  let videoQuality: string;
  let hasAudio: boolean = false;
  const { title, author } = info.basic_info;

  if (!title || !author) {
    return { error: 'Missing title/author info for video'};
  }

  // remove formats that we dont want from the list
  const filterByCodec = (formats: Format[] ) => formats.filter(e => 
    e.mime_type.includes(codecMatch[format].codec) || e.mime_type.includes(codecMatch[format].aCodec)
  ).sort((a, b) => Number(b.bitrate) - Number(a.bitrate));

  // all valid formats sorted by highest bitrate
  let adaptiveFormats = filterByCodec(info.streaming_data.adaptive_formats);
  // if none found using vp9, fall back to h264
  if (adaptiveFormats.length === 0 && format === "vp9") {
      format = "h264"
      adaptiveFormats = filterByCodec(info.streaming_data.adaptive_formats)
  }

  // the first one we find with a video and content will be the best we can get
  const bestVideoFormat = adaptiveFormats.find(i => i.has_video && i.content_length && i.quality_label);

  if (!bestVideoFormat || bestVideoFormat === null) {
    return { error: "No suitable video format" }
  }
  log.info(bestVideoFormat, "Best Video Format full");
  // we know we have a label, we tested for it
  videoQuality = bestVideoFormat.quality_label || "";

  log.info(`best quality found: ${videoQuality}`);
  log.info(`codec used: ${format}`);

  // do we have the audio included already?
  hasAudio = bestVideoFormat.has_audio;
  log.info(`Video has audio ${hasAudio}`);

  let type: dlType = 'video+audio';
  if (!hasAudio) {
    type = 'video';
    log.info('need to download separate audio file');
  }

  // download video
  let dlObj : DLOpts = {
    type: type,
    // quality: bestVideoFormat.quality_label,
    quality: 'best',
    // format: 'mp4',
    format: codecMatch[format].fileExtention,
    contentLength: bestVideoFormat.content_length || 0,
  }

  const tmpVideoFile = tmpFilePath();
  let finalTmpFile = tmpVideoFile;

  await download(videoID, dlObj, tmpVideoFile);

  if (!hasAudio) {
    const filteredAudioFormats = adaptiveFormats.filter((i) => i.has_audio)
    .sort((a, b) => Number(b.bitrate) - Number(a.bitrate));
    log.info(filteredAudioFormats.map((f) => (printAdaptiveFormat(f))), "Filtered Audio Formats");
    const bestAudioFormat = filteredAudioFormats.find((i) => i.has_audio && i.content_length);

    if (!bestAudioFormat || bestAudioFormat === null) {
      return { error: "No suitable audio format" }
    }
    log.info(bestAudioFormat, "Best Audio Format full");

    dlObj = {
      type: 'audio',
      quality: 'best',
      contentLength: bestAudioFormat.content_length || 0,
    }

    const tmpAudioFile = tmpFilePath();

    await download(videoID, dlObj, tmpAudioFile);

    const combinedFile = `${tmpFilePath(codecMatch[format].fileExtention)}`;

    // combine with ffmpeg
    // https://stackoverflow.com/questions/72176714/merge-video-and-audio-using-ffmpeg-in-express-js
    // https://stackoverflow.com/questions/71257182/merge-audio-with-video-stream-node-js
    // but mostly
    // https://github.com/imputnet/cobalt/blob/b1ed1f519985daa20f9c35145ada260d902fa0d8/src/modules/stream/types.js#L86

    let ffmpegCmd: string[] = [
      // supress non-crucial messages
      '-loglevel', '8', '-hide_banner',
      // input video and audio by file
      '-i', tmpVideoFile,'-i', tmpAudioFile,
      // map each input file to what they are v/a
      '-map', '0:v', '-map', '1:a',
      // '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      // '-c:a', 'aac', '-vf', 'yuv420p', '-movflags', '+faststart',
      // `${combinedFile}`
    ];

    ffmpegCmd = ffmpegCmd.concat(codecMatch[format].ffmpegArgs);
    ffmpegCmd.push(combinedFile);

    log.info(`${ffmpegPath} ${ffmpegCmd.join(" ")}`);
      
    const ffmpegP = new Promise((resolve, reject) => {
      // TODO: ffmpegPath can be null
      const ffmpegProcess = cp.spawn(ffmpegPath || "", ffmpegCmd,
      {
        windowsHide: true,
        stdio: [
          'inherit', 'inherit', 'inherit',
          'pipe', 'pipe', 'pipe',
        ],
      });

      ffmpegProcess.on('close', () => {
        log.info("Merging Completed");
        resolve(combinedFile);
      });
      ffmpegProcess.on('error', (err) => {
        log.error(err, 'could not ffmpeg');
        reject();
      });

      log.info('ffmpeg initialization completed');
    });

    await ffmpegP;
    log.info('completed ffmpeg video merging');
    finalTmpFile = combinedFile;
    // process.exit(1);
    // cleanup audio file
    rm(tmpAudioFile);
    // cleanup tmp video file since we combined it
    rm(tmpVideoFile);
  }

  let fileInfo : YTFile = {
    fileExtention: codecMatch[format].fileExtention,
    filename: videoStoragePath(authorID, title),
    authorID,
    contentLength: getFilesizeInBytes(finalTmpFile),
    id: videoID,
    recordType: RecordTypes.VIDEO_FILE,
  }

  await rename(finalTmpFile, fileInfo.filename);
  log.info(`File Moved: ${finalTmpFile} to ${fileInfo.filename}`);
  log.info(fileInfo, 'File Info');

  const DB = await getDB();
  await DB.insertOrUpdateObj(fileInfo);

  const tns = await saveThumbnails(authorID, info.basic_info.thumbnail || []);

  const videoRecord: YTVideoInfo = {
    title,
    thumbnails: tns,
    authorID,
    durationText: `${info.basic_info.duration}`,
    durationSeconds: info.basic_info.duration || 0,
    id: videoID,
    recordType: RecordTypes.VIDEO,
  }

  await DB.insertOrUpdateObj(videoRecord);

  return { videoId: videoID, authorID }
}


function widthToSize(w: number) {
  if (w > 720) {
    return 'xlarge';
  }
  if (w > 360) {
    return 'large';
  }
  if (w > 176) {
    return 'medium';
  }
  if (w > 88) {
    return 'small';
  }
  return 'tiny';
}

function convertThumbnails(thumbnails : Thumbnail[]): YTThumbnail[] {
  return thumbnails.map((t) => (
    {
      id: t.url,
      width: t.width,
      height: t.height,
      url: t.url,
      size: widthToSize(t.width),
    }
  ));
}

async function saveAuthors(author: Author) {
  const DB = await getDB();
  const aRecord = await DB.findOne<YTAuthor>(RecordTypes.AUTHOR, author.id);
  if (aRecord) {
    log.info(`already have author: ${author.id}`);
    return;
  }
  // pull down thumbnails
  const tns = await saveThumbnails(author.id, author.thumbnails);

  // insert author
  const a : YTAuthor = {
    name: author.name,
    url: author.url,
    thumbnails: tns,
    id: author.id,
    recordType: RecordTypes.AUTHOR,
  }
  await DB.insertOrUpdateObj(a);
  log.info(`author saved ${a.id}`);
}

function createAuthor(a: Author): YTAuthor {
  const author: YTAuthor = {
    recordType: RecordTypes.AUTHOR,
    id: a.id,
    name: a.name,
    url: "",
    thumbnails: convertThumbnails(a.thumbnails),
  }
  return author;
}

// TODO: should we pull our versions?
function addAuthorToList(a: Author, authors: {[key: string]: YTAuthor}) {
  // log.info(`author check for '${a.id}'`);
  if (authors[a.id]) {
    return;
  }
  const author = createAuthor(a);
  authors[a.id] = author;
  saveAuthors(a);
}

export async function search(query: string, opts : SearchOptions): Promise<YTSearchResponse> {
  log.info({query, opts}, "YT Search");
  const results = await (await getYT()).search(query, opts);
  const DB = await getDB();

  // parse results
  const sr : YTSearchResponse = {
    query,
    videos: [],
    channels: [],
    authors: {},
  }

  if (results?.results?.length !== undefined && results.results.length  > 0) {
    const vids = results.videos;
    for (let i = 0; i < vids.length; i += 1) {
      const v = vids[i];
      if (v.type === 'Video') {
        const vid = v as Video;
        const videoResult : YTVideoInfo = {
          title: vid.title.toString(),
          thumbnails: convertThumbnails(vid.thumbnails),
          authorID: vid.author.id,
          durationText: vid.duration.text,
          durationSeconds: vid.duration.seconds,
          // fileID: "",
          id: vid.id,
          recordType: RecordTypes.VIDEO,
        }
        sr.videos.push(videoResult);
        addAuthorToList(vid.author, sr.authors);
      }
    }

    const channels = results.channels;
    for (let i = 0; i < channels.length; i += 1) {
      const c = channels[i];
      const chanResult : YTChannelInfo = {
        // @ts-ignore
        name: c["description_snippet"]?.text || "UNKNOWN",
        authorID: c.author.id,
        videoIDs: [],
        stayUpdated: false,
        id: c.id,
        recordType: RecordTypes.CHANNEL,
      }
      sr.channels.push(chanResult);
      addAuthorToList(c.author, sr.authors);
    }
  }

  // add fileID's for all the videos we have, add fake ones for queued ones
  const lookups = sr.videos.map((v) => {
    return new Promise(async (resolve) => {
      const file = await DB.findOne<YTFile>(RecordTypes.VIDEO_FILE, v.id)
        .catch(() => resolve(true));
      if (file) {
        v.fileID = file.id;
      } else {
        const queue = await DB.findOne<YTQueue>(RecordTypes.DL_QUEUE, v.id);
        if (queue) {
          v.fileID = "In Queue";
        }
      }
      resolve(true);
    });
  });

  await Promise.all(lookups);

  return sr;
}
