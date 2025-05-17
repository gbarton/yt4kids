import { Elysia } from "elysia";
import swagger from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { cors } from '@elysiajs/cors';
import { UserEndpoints } from "./lib/routes/User";
import Logger from './lib/Log';
import { VideoEndpoints } from "./lib/routes/Videos";
import { ExternalEndpoints } from "./lib/routes/YT";

import Manager from "./lib/Manager";
import { AuthorsEndpoints } from "./lib/routes/Authors";
import { migrateDB } from "./db/DB";
import { QueueEndpoints } from "./lib/routes/Queues";

async function init() {
  Logger.info('migrating db');
  await migrateDB();
  return;
}

// wait for our db connection to come online before starting web server
await init();

Logger.info('DB migrations complete, starting server');

Manager.getInstance();

const PORT = +(Bun.env.YT_PORT || 3000);

const app = new Elysia()
  .use(Logger.into())
  .use(cors())
  .use(swagger())
  .use(staticPlugin({
    assets: 'public/',
    prefix: '/',
  }))
  .group('/api', (api) => 
    api
      .get('', () => "Hello Elysia")
      .use(UserEndpoints)
      .use(VideoEndpoints)
      .use(AuthorsEndpoints)
      .use(ExternalEndpoints)
      .use(QueueEndpoints)
  )
  .listen(PORT);

Logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;

// const die = async () => {
//   Logger.warn('shutting down from signal');
//   await stop();
//   Logger.warn('db down');
//   await app.stop();
//   Logger.warn('app down');
//   process.exit();
// }

// process.on("SIGINT", async () => {
//   await die();
// });

// process.on("SIGKILL", async () => {
//   await die();
// });