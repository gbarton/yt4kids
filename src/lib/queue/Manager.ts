import log from "../log/Logger";
import getDB, { getQueued } from '../db/DB';
import * as Downloader from '../yt/Downloader';
import { YTQueue } from "../db/Types";

export default class Manager {
  // our one and only copy
  static #instance: Manager;

  private interval: number = 300000;
  private timer : NodeJS.Timer;
  private running: Boolean = false;
  private skipAfter: number = 10;

  private constructor() {
    if (process.env.YT_DOWNLOAD_INTERVAL) {
      this.interval = +process.env.YT_DOWNLOAD_INTERVAL;
    }
    if (process.env.YT_DOWNLOAD_RETRIES) {
      this.skipAfter = +process.env.YT_DOWNLOAD_RETRIES;
    }
    const that = this;
    this.timer = setInterval(() => {
      log.info('manager interval check');
      that.tick();
    },
    this.interval);
  }

  public static getInstance(): Manager {
    if (!Manager.#instance) {
      Manager.#instance = new Manager();
    }

    return Manager.#instance;
  }

  private async downloadVideos() {
    const queue = await getQueued(20);
    
    if (queue.length == 0) {
      return;
    }
    log.info(`queue length: ${queue.length}`);
    
    this.running = true;
    const q = queue[0];

    log.info(q, 'next to dl');

    const obj = await Downloader.downloadYTVideo(q.id, q.authorID).catch((err) => {
      log.warn(`unable to download video: ${q.id}`);
      log.error(err);
      return { error: "yup" };
    });

    if (!obj.error) {
      q.complete = true;
    } else {
      q.attempts = (q.attempts ? q.attempts : 0) + 1
      if (q.attempts >= this.skipAfter) {
        q.skip = true;
      }
    }

    const DB = await getDB();
    await DB.insertOrUpdateObj<YTQueue>(q);

    // SUPER lame way to force it to wait a while longer
    const that = this;
    setTimeout(() => {
      log.info("manager free");
      that.running = false;
    }, this.interval);
  }

  /**
   * performs a check to see if there is any video's waiting to be downloaded
   */
  private tick() {
    if (!this.running) {
      this.downloadVideos();
    } else {
      log.info('manager already busy');
    }
  }
}