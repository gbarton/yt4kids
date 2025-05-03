// use this to migrate the lokijs files over into PG
import { Author, Thumbnail, Video } from "./db/schema";
import Logger from "./lib/Log";
import { Authors } from "./lib/routes/Authors";
import { Thumbnails } from "./lib/routes/Thumbnails";
import { Videos } from "./lib/routes/Videos";

export async function loadLokiData() {
  Logger.info('reading index');
  const dbIndexFile = Bun.file('./storage/db/yt4kids.db');
  
  const dbIndexJson = await dbIndexFile.json();
  const collectionsArr = dbIndexJson['collections'].map((o: any) => o['name']);
  Logger.info(collectionsArr, 'found collections');
  
  // load up the files so we can reference info
  const tfileTablePos = collectionsArr.findIndex((table: any) => table === 'THUMBNAIL_FILE');
  Logger.info(`thumbnailsTable is db file: ${tfileTablePos}`);
  
  const thumbFile = Bun.file(`./storage/db/yt4kids.db.${tfileTablePos}`);
  if(!thumbFile.exists()) {
    Logger.error('no thumbnail file table found');
    process.exit(1);
  }
  
  const thumbFileText =  await thumbFile.text();
  // so we can look these up to finish later
  const thumbData: Record<string, Thumbnail> = {};
  thumbFileText.split('\n').map((str) => {
    try {
      if (str.length == 0) {
        return;
      }
      const json = JSON.parse(str);
      if (!json['id']) {
        return;
      }
      const t: Thumbnail = {
        id: json['id'],
        url: null,
        width: 0,
        height: 0,
        size: "",
        fileExtention: json['fileExtention'],
        filename: json['filename'],
        authorId: json['authorID'],
        contentLength: json['contentLength']
      };
      thumbData[t.id] = t;
    } catch(err) {
      Logger.warn(`unable to parse thumbail file record: '${str}'`);
      throw err;
    }
  });
  
  
  
  // we need authors
  const authorTablePos = collectionsArr.findIndex((table: any) => table === 'AUTHOR');
  Logger.info(`authorTable is db file: ${authorTablePos}`);
  
  const authorFile = Bun.file(`./storage/db/yt4kids.db.${authorTablePos}`);
  if(!authorFile.exists()) {
    Logger.error('no author file found');
    process.exit(1);
  }
  
  // authors have their thumbnails embedded
  const authorText = await authorFile.text();
  const authors: Author[] = [];
  const authorThumbnails : Thumbnail[] = [];
  
  authorText.split('\n').map((line) => {
    try {
      if(line.length == 0) {
        return;
      }
  
      const authorJson = JSON.parse(line);
      if (!authorJson['name'] || !authorJson['id']) {
        return;
      }
      authors.push({
        id: authorJson['id'],
        name: authorJson['name'],
        url: authorJson['url'] || 'unk',
      });
    
      if(authorJson['thumbnails']) {
        authorJson['thumbnails'].map((t: any) => {
          if (t['id'] in thumbData) {
            const thumb = thumbData[t['id']];
            thumb.width = t['width'];
            thumb.height = t['height'];
            thumb.size = t['size'];
            authorThumbnails.push(thumb);
          }
        });
      }
    } catch(err) {
      Logger.error(`unable to parse author: '${line}'`);
      throw err;
    }
  });
  
  // video files
  // load up the files so we can reference info
  const vfileTablePos = collectionsArr.findIndex((table: any) => table === 'VIDEO_FILE');
  Logger.info(`videoFilesTable is db file: ${vfileTablePos}`);
  
  const vFile = Bun.file(`./storage/db/yt4kids.db.${vfileTablePos}`);
  if(!vFile.exists()) {
    Logger.error('no video file table found');
    process.exit(1);
  }
  
  const vFileText =  await vFile.text();
  // so we can look these up to finish later
  const vData: Record<string, Video> = {};
  vFileText.split('\n').map((str) => {
    try {
      if (str.length == 0) {
        return;
      }
      const json = JSON.parse(str);
      if (!json['id']) {
        return;
      }
      const v: Video = {
        id: json['id'],
        title: null,
        durationText: '',
        durationSeconds: 0,
        quality: '',
        format: '',
        fileExtention: json['fileExtention'],
        filename: json['filename'],
        authorId: json['authorID'],
        contentLength: json['contentLength']
      };
      vData[v.id] = v;
    } catch(err) {
      Logger.warn(`unable to parse video file record: '${str}'`);
      throw err;
    }
  });
  
  // video info data
  const videoTablePos = collectionsArr.findIndex((table: any) => table === 'VIDEO');
  Logger.info(`videoTable is db file: ${videoTablePos}`);
  
  const videoFile = Bun.file(`./storage/db/yt4kids.db.${videoTablePos}`);
  if(!videoFile.exists()) {
    Logger.error('no video file found');
    process.exit(1);
  }
  
  // videos have their thumbnails embedded
  const videoText = await videoFile.text();
  
  const videos: Video[] = [];
  const videoThumbnails : Thumbnail[] = [];
  
  videoText.split('\n').map((line) => {
    try {
      if(line.length == 0) {
        return;
      }
  
      const videoJson = JSON.parse(line);
      if (!videoJson['title'] || !videoJson['id']) {
        return;
      }
  
      // go get our file data
      if(videoJson['id'] in vData) {
        const video = vData[videoJson['id']];
  
        // add in other data
        video.title = videoJson['title'];
        video.durationSeconds = videoJson['durationSeconds'];
        video.durationText = videoJson['durationText'];
        videos.push(video);
      }
  
      if(videoJson['thumbnails']) {
        videoJson['thumbnails'].map((t: any) => {
          if (t['id'] in thumbData) {
            const thumb = thumbData[t['id']];
            thumb.width = t['width'];
            thumb.height = t['height'];
            thumb.size = t['size'];
            videoThumbnails.push(thumb);
          }
        });
      }
    } catch(err) {
      Logger.error(`unable to parse video: '${line}'`);
      throw err;
    }
  });
  
  
  
  // ready to load
  
  Logger.debug(`authors to load: ${authors.length}`);
  Logger.debug(`Author thumbnails to load: ${authorThumbnails.length}`);
  
  Logger.debug(`Videos to load: ${videos.length}`);
  Logger.debug(`Video thumbnails to load: ${videoThumbnails.length}`);
  
  const Auth = new Authors();
  Object.values(authors).map(async (a) => {
    await Auth.insertAuthor(a);
  });
  
  const Thumb = new Thumbnails();
  await Thumb.insertThumbnails(authorThumbnails);
  await Thumb.insertThumbnails(videoThumbnails);
  
  const Vid = new Videos();
  videos.map(async(v) => {
    await Vid.insertVideo(v);
  })
}

