import dotenv from "dotenv";

dotenv.config();

import express, { Request, Response, NextFunction } from 'express';

// extend the express request object to allow a user object
declare global {
  namespace Express {
    export interface Request {
      user?: YTProfile
    }
  }
}

const app = express();
import cors from 'cors';
app.use(cors());
import bodyParser from 'body-parser';

// import { handler } from './build/handler.js'
// import { handler } from '../../client/build/handler'

// app.use(handler);

import log from './lib/log/Logger'

import * as Util from './lib/utils/Utils';
import getDB, { getVideos, addQueue, getUser } from "./lib/db/DB";

// import Logger from 'pino-http'
// const httpLog = Logger({ logger: log })

import * as YT from './lib/yt/Downloader';
import { existsSync, createReadStream, ReadStream } from 'fs';
import ContentDisposition from 'content-disposition';
import { MediaTypes, RecordTypes, SearchOptions, UploadDate, YTFile, YTPassword, YTProfile, YTQueue, YTSearch, YTSearchResponse, YTThumbnail, YTVideoInfo } from "./lib/db/Types";

import bcrypt from 'bcrypt'
import jsonwebtoken, { VerifyErrors } from 'jsonwebtoken';

import Manager from './lib/queue/Manager';
Manager.getInstance();

// TODO: env
const port = +(process.env.YT_PORT || 3000);

import path from 'path';

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

// USER management

const ACCESS_SECRET = process.env.YT_ACCESS_SECRET || "NO";
const REFRESH_SECRET = process.env.YT_REFRESH_SECRET || "NO";

if (ACCESS_SECRET === "NO" || REFRESH_SECRET == "NO") {
  log.error("jwt secrets not set, please set some!");
  process.exit(1);
}

function generateLoginResponse(payload: YTProfile) {
  // TODO: add expires env props
  const accessToken = jsonwebtoken.sign(payload, ACCESS_SECRET, { expiresIn: "20s" });
  const refreshToken = jsonwebtoken.sign(payload, REFRESH_SECRET, {expiresIn: "1d" });
  return {
    accessToken,
    refreshToken,
    user: payload,
  };
}

/**
 * middleware that will ensure the user is valid and logged in
 * @param req 
 * @param res 
 * @param next 
 * @returns calls next() if all is well
 */
function validateToken(req: Request, res: Response, next: NextFunction) {
  // 400 bad, 401 Unauth (unknown login) 403 Unauth (known but not allowed)
    //get token from request header
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.split(" ")[1];
  if (token == null) {
    log.debug("no token to validate");
    return res.status(401).send("please login");
  }
  jsonwebtoken.verify(token, ACCESS_SECRET, (err: any, user: any) => {
    if (err) {
      log.warn("auth verify fail");
      return res.status(403).send("I don't trust you, please login again");
    } else {
      req.user = user as YTProfile;
      next();
    }
  });
}

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 */
function adminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    log.warn("user not found trying to verify admin role!");
    return res.status(401).send('who are you? Please login');
  }
  if (!req.user.admin) {
    log.info(req.user.email, "user not admin");
    return res.status(403).send("admin you are not");
  }
  return next();
}

app.get('/api/testValid', validateToken, async (req, res) => {
  log.info(req.user, 'validation succeeded');
  return res.send("ok");
});

// user can request a new token set passing in their refreshToken
// in the body as refreshToken
app.post('/api/refreshToken', async (req, res) => {
  log.info("refresh token request");
  log.info(req.body);
  const { refreshToken } = req?.body;
  if (refreshToken === undefined) {
    return res.status(400).send("unable to refresh your token, please login");
  }
  jsonwebtoken.verify(refreshToken, REFRESH_SECRET, async (err: any, tokenObj: any) => {
    if (err) {
      log.warn(err, "error with users refresh token");
      return res.status(404).send("error with refreshToken, please login");
    }
    log.info(tokenObj, "refresh token verified");
    const user = await getUser(tokenObj.email);
    if (!user) {
      return res.status(400).send("cant find user");
    }

    return res.send(generateLoginResponse(user));
  });
});

app.post('/api/login', async (req, res) => {
  const { password, email } = req?.body;
  if ((password === undefined || password === null) || 
    (email === undefined || email === null)) {
      return res.status(400).send("missing creds");
  }
  const user = await getUser(email);
  const DB = await getDB();
  const pw = await DB.findOne<YTPassword>(RecordTypes.USER_PWHASH, email);
  // TODO: debounce?
  if (!user || !pw) {
    return res.status(400).send("user not found");
  }
  const cryptResult = await bcrypt.compare(password, pw.pwHash);
  if (!cryptResult) {
    return res.status(401).send("auth failed");
  }
  // all good, generate a JWT token
  const usrObj = generateLoginResponse(user);
  log.info(`logged in user ${user.email}`);
  return res.send(usrObj);
});

// src: https://medium.com/@prashantramnyc/authenticate-rest-apis-in-node-js-using-jwt-json-web-tokens-f0e97669aad3
// list users
app.get('/api/user', async (req, res) => {
  const DB = await getDB();
  const users = await DB.find<YTProfile>(RecordTypes.USER_PROFILE, {});
  // filter out password hash
  return res.send(users);
});

// create new user
app.post('/api/user', async (req, res) => {
  log.info('new user request');
  const { displayName, password, email, admin } = req?.body;
  if ((displayName === undefined || displayName === null) ||
    (password === undefined || password === null) || 
    (email === undefined || email === null)) {
    return res.status(400).send("missing user information");
  }

  // TODO: validate email
  const DB = await getDB();
  const users = await DB.find<YTProfile>(RecordTypes.USER_PROFILE, { limit: 1 });
  let userRecord = await getUser(email);
  if (userRecord !== null) {
    return res.status(400).send("User already exists, use different email or login");
  }
  userRecord = {
    id: email,
    recordType: RecordTypes.USER_PROFILE,
    email,
    displayName,
    admin: admin || users.length == 0,
  }
  const pwRecord : YTPassword = {
    id: email,
    recordType: RecordTypes.USER_PWHASH,
    pwHash: await bcrypt.hash(password, 10)
  }
  await DB.insertOrUpdateObj(userRecord);
  await DB.insertOrUpdateObj(pwRecord);
  return res.send("ok");
});

const isMediaType = Util.inStringEnum(MediaTypes);
const isUploadType = Util.inStringEnum(UploadDate);

// search youtube for videos
app.get('/api/yt/search', validateToken, adminRole, async (req, res) => {
  const {query, type, upload_date, page } = req?.query;
  if (!query) {
    return res.status(400).send('no query provided');
  }
  const opts : SearchOptions = { page: page ? +page : 1 }
  if (type && isMediaType(type.toString())) {
    opts.type = type.toString() as MediaTypes;
  }
  if (upload_date && isUploadType(upload_date.toString())) {
    opts.upload_date = upload_date.toString() as UploadDate;
  }

  const results = await YT.search(query.toString(), opts);
  return res.send(results);
});

// retrieve detailed video information
app.get('/api/yt/video/:videoID', async (req, res) => {
  const obj = await YT.getYTVideoDetails(req.params.videoID);
  res.send(obj);
});

// queue up video for downloading later
app.post('/api/yt/video/queue', validateToken, adminRole, async (req, res) => {
  log.info(req?.body, 'queue yt video post called');
  if (!req?.body || !req.body.authorID || !req.body.videoID || !req.body.title) {
    return res.status(400).send('missing body params {videoID, authorID, title}')
  }
  const resp = await addQueue(req.body.videoID, req.body.authorID, req.body.title);
  return res.send(resp);
});

// download video right now
app.post('/api/yt/video', validateToken, adminRole, async (req, res) => {
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

// get dl queue
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

// toggle skip this queue item
app.post('/api/queue/:id/skip', async (req, res) => {
  log.info(req?.body, 'skip queue post called');
  if (!req?.body || !req.body.id || !req.body.recordType) {
    return res.status(400).send('missing body params {id, recordType}');
  }
  if (req.body.recordType !== RecordTypes.DL_QUEUE) {
    return res.status(400).send('does not look like a queue record');
  }
  const DB = await getDB();
  const record = await DB.findOne<YTQueue>(RecordTypes.DL_QUEUE, req.body.id);
  if (!record) {
    return res.status(400).send("unable to find record");
  }
  record.skip = !record.skip;
  // reset the attempts so it will try again
  if (!record.skip) {
    record.attempts = 0;
  }
  await DB.insertOrUpdateObj<YTQueue>(record);
  return res.send(record);
});

// delete an object in the queue, sometimes videos glitch and just wont DL
app.delete('/api/queue', validateToken, adminRole, async( req, res) => {
  log.debug(`${req.body} delete queue record called`);
  if (!req?.body || !req.body.id || !req.body.recordType) {
    return res.status(400).send('missing body params {id, recordType}');
  }
  if (req.body.recordType !== RecordTypes.DL_QUEUE) {
    return res.status(400).send('does not look like a queue record');
  }
  const DB = await getDB();
  const record = await DB.findOne(RecordTypes.DL_QUEUE, req.body.id);
  if (!record) {
    return res.send('ok');
  }
  await DB.delete(record);
  return res.send('ok');
});

function combineSearchResults(results: YTSearchResponse, add: YTSearchResponse) : YTSearchResponse {
  const com = {
    query: results.query,
    videos: [...results.videos, ...add.videos],
    channels: [...results.channels, ...add.channels],
    authors: results.authors,
  }
  
  for (let k in add.authors) {
    if (!com.authors[k]) {
      com.authors[k] = add.authors[k];
    }
  }

  return com;
}

// simple local search for content
app.get('/api/search', async (req, res) => {
  log.info('local search called');
  log.info(req.query);
  let searchOpts: YTSearch = {
    search: "",
    authorID: undefined,
    channelID: undefined,
  }
  searchOpts = {...searchOpts, ...req.query};

  let results : YTSearchResponse = {
    query: "",
    channels: [],
    videos: [],
    authors: {}
  }

  log.info(searchOpts, 'searchOpts');
  const videoResults = await getVideos(searchOpts);
  results = combineSearchResults(results, videoResults);
  res.send(results);
});

/**
 * Headers for sending back to the client
 */
type Head = {
  [key: string]: string | number,
}

// retrieve local thumbnail
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

// get local video information
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
      // 'Content-Length': fileSize, // doesnt work
      // 'X-Content-Type-Options': 'nosniff',  // no effect
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