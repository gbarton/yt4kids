import dotenv from "dotenv";

dotenv.config();

import express from 'express';
const app = express();
import cors from 'cors';
app.use(cors());
import bodyParser from 'body-parser';

// import { handler } from './build/handler.js'
// import { handler } from '../../client/build/handler'

// app.use(handler);

import log from './lib/log/Logger'

import * as Util from './lib/utils/Utils';
import getDB, { getVideos, addQueue } from "./lib/db/DB";

// import Logger from 'pino-http'
// const httpLog = Logger({ logger: log })

import * as YT from './lib/yt/Downloader';
import { existsSync, createReadStream, ReadStream } from 'fs';
import ContentDisposition from 'content-disposition';
import { MediaTypes, RecordTypes, SearchOptions, UploadDate, YTFile, YTQueue, YTThumbnail, YTVideoInfo } from "./lib/db/Types";

import Manager from './lib/queue/Manager';
Manager.getInstance();

// TODO: env
const port = +(process.env.YT_PORT || 3000);

import path from 'path'

app.use('/', express.static(path.join(__dirname, 'public')));

// app.use(httpLog);
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get('/api', (req, res) => {
  res.send('Hello api World!')
});

app.get('/api/hello', (req, res) => {
  res.send('api server hello!');
});

const isMediaType = Util.inStringEnum(MediaTypes);
const isUploadType = Util.inStringEnum(UploadDate);

app.get('/api/yt/search', async (req, res) => {
  const {query, type, upload_date } = req?.query;
  if (!query) {
    return res.status(400).send('no query provided');
  }
  const opts : SearchOptions = {}
  if (type && isMediaType(type.toString())) {
    opts.type = type.toString() as MediaTypes;
  }
  if (upload_date && isUploadType(upload_date.toString())) {
    opts.upload_date = upload_date.toString() as UploadDate;
  }

  const results = await YT.search(query.toString(), opts);
  return res.send(results);
});

app.get('/api/yt/video/:authorID/:videoID', async (req, res) => {
  await YT.downloadYTVideo(req.params.videoID, req.params.authorID);
  res.send(req.params.videoID);
});

app.post('/api/yt/video/queue', async (req, res) => {
  log.info(req?.body, 'queue yt video post called');
  if (!req?.body || !req.body.authorID || !req.body.videoID || !req.body.title) {
    return res.status(400).send('missing body params {videoID, authorID, title}')
  }
  const resp = await addQueue(req.body.videoID, req.body.authorID, req.body.title);
  return res.send(resp);
});

app.post('/api/yt/video', async (req, res) => {
  log.info(req?.body, 'download yt video post called');
  if (!req?.body || !req.body.authorID || !req.body.videoID) {
    return res.status(400).send('missing body params {videoID, authorID}')
  }
  const response = await YT.downloadYTVideo(req.body.videoID, req.body.authorID);
  if (response.error) {
    return res.status(500).send(response.error);
  }
  return res.send(response);
});

app.get('/api/queue', async (req, res) => {
  const DB = await getDB();
  const queue = await DB.find<YTQueue>(RecordTypes.DL_QUEUE,
    { limit: 1000,
      sortBy: "requestedDate",
      sortByDescending: true,
     })
    .catch((err) => {
      log.warn("issues getting the queues");
      log.error(err);
      return res.send([]);
    });
  return res.send(queue);
});

// get all videos
// TODO: filters!
app.get('/api/search', async (req, res) => {
  log.info('local search called');
  let searchOpts = {
    search: "",
    authorID: undefined,
    type: "",
  }
  searchOpts = {...searchOpts, ...req.query};
  if (searchOpts.type !== "" && isMediaType(searchOpts.type)) {
    searchOpts.type = searchOpts.type.toString() as MediaTypes;
  }
  log.info(searchOpts, 'searchOpts');
  const results = await getVideos(searchOpts?.authorID);
  res.send(results);
});

/**
 * Headers for sending back to the client
 */
type Head = {
  [key: string]: string | number,
}

app.get('/api/thumbnails/:id', async (req, res) => {
  const DB = await getDB();
  const fileInfo = await DB.findOne<YTFile>(RecordTypes.THUMBNAIL_FILE, req.params.id);
  if (!fileInfo || fileInfo === undefined) {
    log.warn(`could not find the thumbnail file`);
    return res.status(400).send('file meta not found');
  }

  let stream: ReadStream;
  stream = createReadStream(fileInfo.filename);
  const headers: Head = {
    'Content-Length': fileInfo.contentLength,
    'Content-Type': 'image/jpg',
    // 'Content-Disposition': ContentDisposition(path),
  }

  res.status(200);
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i += 1) {
    res.set(keys[i], `${headers[keys[i]]}`);
  }
  return stream.pipe(res);
});


app.get('/api/video/:id', async (req, res) => {
  const id = req.params.id;
  log.info(`video info request for id ${id}`);
  if (Util.isNull(id)) {
    return res.status(400).send('no id present');
  }
  const DB = await getDB();
  const record = await DB.findOne<YTVideoInfo>(RecordTypes.VIDEO, id);
  // log.info(record, 'video info');
  if (!record || record === undefined) {
    return res.status(400).send('video meta not found');
  }
  return res.send(record);
});

const contentType: {[key: string]: string} = {
  "mp4": "video/mp4",
}

// get a video stream
app.get('/api/video/chunk/:id', async (req, res) => {
  const id = req.params.id;
  log.info(`request for id ${id}`);
  if (Util.isNull(id)) {
    return res.status(400).send('no id present');
  }
  const DB = await getDB();
  const record = await DB.findOne<YTFile>(RecordTypes.VIDEO_FILE, id);
  // log.info(record, 'video requested');
  if (!record || record === undefined) {
    return res.status(400).send('video meta not found');
  }
  if (!record?.filename) {
    return res.status(400).send('video file not found');
  }
  if (!existsSync(record.filename)) {
    return res.status(400).send('video not found');
  }

  const range = req.headers.range;
  const fileSize = record.contentLength;
  const path = record.filename;

  let stream: ReadStream;
  let headers: Head;
  let headerCode = 200;

  // found here
  // https://stackoverflow.com/questions/4360060/video-streaming-with-html-5-via-node-js

  if (range) {
    log.info(`range header found!: ${range}`);
    const parts = range.replace(/bytes=/, "").split("-");
    // we use this when there isnt a limit in the range
    const chunkLimit10MB = 10 * 1048576;
    const start = parseInt(parts[0], 10);
    // we will use the range if present
    // we will cap the chunk at 10MB or the end of the file if
    // its under 10MB away
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : Math.min(start + chunkLimit10MB, fileSize - 1);
    const chunksize = (end - start) + 1;
    const responseRange = `bytes ${start}-${end}/${fileSize}`;
    log.info(`range set to '${responseRange}'`);
    stream = createReadStream(path, {start, end});
    headers = {
      'Content-Range': responseRange,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType[record.fileExtention],
      'Content-Disposition': ContentDisposition(path),
    }
    headerCode = 206;
  } else {
    stream = createReadStream(path);
    headers = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Content-Disposition': ContentDisposition(path),
    }
  }

  // res.writeHead(headerCode, headers);
  res.status(headerCode);
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i += 1) {
    res.set(keys[i], `${headers[keys[i]]}`);
  }
  return stream.pipe(res);
});

app.listen(port, async () => {
  log.info(`Example app listening on port ${port}`);
  await getDB();
});