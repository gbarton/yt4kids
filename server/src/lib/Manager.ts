import Logger from "./Log";
import { Tube } from "./routes/YT";
import { Queues } from "./routes/Queues";

export default class Manager {
  // our one and only copy
  static #instance: Manager;

  private interval: number = 300000;
  private timer : NodeJS.Timer;
  private running: Boolean = false;
  private title: string = '';
  private skipAfter: number = 10;

  private yt: Tube;
  private queues: Queues;

  private constructor() {
    if (Bun.env.YT_DOWNLOAD_INTERVAL) {
      this.interval = +Bun.env.YT_DOWNLOAD_INTERVAL;
    }
    if (Bun.env.YT_DOWNLOAD_RETRIES) {
      this.skipAfter = +Bun.env.YT_DOWNLOAD_RETRIES;
    }
    const that = this;
    this.timer = setInterval(() => {
      Logger.info('manager interval check');
      that.tick();
    },
    this.interval);
    this.yt = new Tube();
    this.queues = new Queues();
  }

  public static getInstance(): Manager {
    if (!Manager.#instance) {
      Manager.#instance = new Manager();
    }

    return Manager.#instance;
  }

  private async downloadVideos() {
    this.running = true;
    const q = await this.queues.getNextInQueue();
    // no work to do
    if (!q) {
      this.running = false;
      return;
    }

    Logger.info(q, 'next to dl');
    this.title = q.title;

    const obj = await this.yt.downloadYTVideo(q.id, q.authorId).catch((err) => {
      Logger.warn(`unable to download video: ${q.id}`);
      Logger.error(err);
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

    await this.queues.updateQueue(q.id, q);
    Logger.info(`manager done with: '${this.title}', sleeping`);

    // SUPER lame way to force it to wait a while longer
    const that = this;
    setTimeout(() => {
      Logger.info("manager free");
      that.running = false;
      this.title = '';
    }, this.interval);
  }

  /**
   * performs a check to see if there is any video's waiting to be downloaded
   */
  private tick() {
    if (!this.running) {
      this.downloadVideos();
    } else {
      Logger.info(`manager already busy with: '${this.title}'`);
    }
  }
}