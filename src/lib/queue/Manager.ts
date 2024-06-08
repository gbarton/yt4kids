import log from "../log/Logger";
import getDB, { getQueue } from '../db/DB';
import * as Downloader from '../yt/Downloader';
import { YTQueue } from "../db/Types";

export default class Manager {
  // our one and only copy
  static #instance: Manager;

  private interval: number = 300000;
  private timer : NodeJS.Timer;
  private running: Boolean = false;

  private constructor() {
    if (process.env.YT_DOWNLOAD_INTERVAL) {
      this.interval = +process.env.YT_DOWNLOAD_INTERVAL;
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
    const queue = await getQueue(20);
    
    if (queue.length == 0) {
      return;
    }
    log.info(`queue length: ${queue.length}`);
    
    this.running = true;
    const q = queue[0];

    log.info(q, 'next to dl');

    await Downloader.downloadYTVideo(q.id, q.authorID).catch((err) => {
      log.warn(`unable to download video: ${q.id}`);
      log.error(err);
      this.running = false;
      return;
    });

    q.complete = true;
    const DB = await getDB();
    await DB.insertOrUpdateObj<YTQueue>(q);

    // SUPER lame way to force it to wait a while longer
    const that = this;
    setTimeout(() => {
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