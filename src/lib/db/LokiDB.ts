import log from '../log/Logger'
import Loki from 'lokijs';
//@ts-ignore
import LokiFastAdapter from 'lokijs/src/loki-fs-structured-adapter.js';
import path from 'node:path';
import fs from 'node:fs'
import * as Utils from '../utils/Utils';
import { IDB, QueryOptions, RecordTypes, YTRecord } from './Types';

export default class LokiDatabase implements IDB {
  LOC: string;
  DBPATH: string;
  
  db: Loki | undefined;
  initialized = false;

  constructor() {
    this.LOC = process.env.YK_DB_STORAGE_DIR || 'db';
    this.DBPATH = path.join(this.LOC, 'yt4kids.db');
    log.info(`using db path : ${this.DBPATH}`);
  }
  

  /**
   * can call direct, will also be called at termination
   */
  public async shutdown() {
    if (this?.db !== undefined && this.initialized) {
      log.info('db saving');
      await this.db.saveDatabase();
      log.info('db closing');
      await this.db.close();
      this.initialized = false;
      // db = null;
    }
  }
  
  /**
   * Initializes the DB. This must be called before using store! The type of DB can be defined
   * through several different in the following priority order:
   * 1. Defined as the parameter through this method call.
   * 2. Via the `db.loki.adapter` environment variable
   * 3. Using the default value of 'memory'
   *
   * The following types of adapters are supported:
   * - __disk__: Stores the database in the `quotes.db` environment path location or `db/`
   * - __memory__: An in-memory database
   * @param {?string} adapterType The adapter type
   * @returns a promise that resolves when the db is ready
   */
  public async init(adapterType?: string): Promise<Loki> {
    return new Promise((resolve, reject) => {
      if (this.initialized && this.db !== undefined) {
        log.info('db already initialized');
        resolve(this.db);
      }
      log.info('initializing db');
  
      const whichAdapter = adapterType || process.env.YK_LOKI_ADAPTER || 'memory';
      let adapter = new Loki.LokiMemoryAdapter();
      if (whichAdapter === 'disk') {
        adapter = new LokiFastAdapter();
        log.info('using disk (fast) adapter');
        if (!fs.existsSync(this.LOC)) {
          fs.mkdirSync(this.LOC, { recursive: true });
          log.info(`created directory ${this.LOC}`);
        }
      } else {
        log.info('using loki memory');
      }
      this.db = new Loki(this.DBPATH, {
        adapter,
        autoload: true,
        autoloadCallback: (err) => {
          if (err) {
            return reject(err);
          }
          log.info('database online');
          this.initialized = true;
          if (this.db !== undefined) {
            return resolve(this.db);
          }
        },
        autosave: true,
        autosaveInterval: 500,
      });
    });
  }
  
  /**
   * Ensures the internal database is open and available before allowing modifications.
   */
  ensureDatabaseIsOpen(performInit = false): Promise<Loki> {
    if (this?.db === undefined || this.initialized === false) {
      if (performInit) {
        return this.init();
      }
      throw new Error('The database is not available for use.');
    }
    if (this.db !== undefined){
      return Promise.resolve(this.db);
    }
    return Promise.reject();
  }
  
  async getOrCreateDB(type: RecordTypes): Promise<Collection<any>> {
    // make sure that the type is correct
    if (!(type in RecordTypes)) {
      log.info(`unknown type ${type}`);
      throw new Error(`unknown type: ${type}`);
    }
    const db = await this.ensureDatabaseIsOpen();
    // just use the type as a collection
    let coll = await db.getCollection(type);
    if (Utils.isNull(coll)) {
      coll = await db.addCollection(type, {
        // TODO: probably should get smarter about this
        // indicies: [ ],
      });
      log.info(`created database collection: ${type}`);
    }
    return coll;
  }
  
  async findOne<T extends YTRecord>(type: RecordTypes, id: string): Promise<T | null> {
    // ? obsolete with TS?
    if (Utils.isNull(id)) {
      log.info(`missing id for type: ${type}`);
      throw new Error(`object of type ${type} has no id`);
    }
  
    // just use the type as a collection
    let coll = await this.getOrCreateDB(type);
    const record = await coll.findOne({ id });
    // TODO: vet recordType
    return record as T;
  }
  
  /**
   * Internal function that does multi row finding
   * @param {RecordTypes} type which objects to look for
   * @param {QueryOptions} [options] object with query clauses
   * @returns {Promise<Object>} Loki.Resultset returned for working with
   */
  async fetch(type: RecordTypes, options: QueryOptions): Promise<Resultset<any>> {
    if (Utils.isNull(options) || Object.keys(options).length === 0) {
      log.info(options, `missing options for find`);
      throw new Error(`find query for type ${type} has no options`);
    }

    const opts: QueryOptions = {
      sortByDescending: false,
      ...options
    }
  
    // just use the type as a collection
    let coll = await this.getOrCreateDB(type);
  
    let results = coll.chain();
    if (opts?.clause !== undefined) {
      results = results.find(opts.clause);
    }
    if (opts?.sortBy !== undefined) {
      results = results.simplesort(opts.sortBy, opts.sortByDescending);
    }
    if (opts?.sortFunction !== undefined) {
      results = results.sort(opts.sortFunction);
    }
    if (opts.limit !== undefined) {
      results = results.limit(opts.limit);
    }
  
    return results;
  }
  
  /**
   * Generic multi row fetch
   * @param {RecordTypes} type which objects to look for
   * @param {QueryOptions} [options] object with query clauses
   */
  public async find(type: RecordTypes, options: QueryOptions) {
    log.info(options, `find ${type}`);
    const results = await this.fetch(type, options);
    return results.data();
  }
  
  /**
   * Generic multi row fetch
   * @param {RecordTypes} type which objects to look for
   * @param {QueryOptions} [options] object with query clauses
   */
  public async removeAll(type: RecordTypes, options: QueryOptions) {
    log.info(options, `removeAll: ${type}`);
    const results = await this.fetch(type, options);
    await results.remove();
  }
  
  /**
   * deletes a record from the database
   * does not work for quotes!
   * @param {RecordTypes} type what type of record to delete
   * @param {string} id of the record to delete
   */
  public async remove(type: RecordTypes, id: string) {
    log.info(id, `remove called: ${type}`);
  
    const record = await this.findOne(type, id);
    const db = await this.ensureDatabaseIsOpen()
    const coll = await db.getCollection(type);
    await coll.remove(record);
  }
  
  /**
   * Generic insert/update function that works based on a type and present
   * id field in the object
   * @param {RecordTypes} type what type of object is this
   * @param {*} obj the record to insert or save based on its id field
   */
  public async insertOrUpdateObj<T extends YTRecord>(obj: T) {
    // just use the type as a collection
    let coll = await this.getOrCreateDB(obj.recordType);
    // poor mans clone
    const json = Utils.deepCopy(obj);
    let record = await coll.findOne({ id: json.id });
  
    if (Utils.isNull(record)) {
      record = json;
      await coll.insert(record);
      log.info(`inserted ${obj.recordType}: ${record.id}`);
    } else {
      // update the existing record with new fields
      Object.assign(record, json);
      await coll.update(record);
      log.info(`updated ${obj.recordType}: ${record.id}`);
    }
  }
}