import { Elysia } from "elysia";
import swagger from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { cors } from '@elysiajs/cors';
import { UserEndpoints } from "./lib/routes/User";
import Logger from './lib/Log';
import { VideoEndpoints } from "./lib/routes/Videos";
import { ExternalEndpoints } from "./lib/routes/YT";

import Manager from "./lib/Manager";
Manager.getInstance();

const PORT = +(Bun.env.YT_PORT || 3000);

const app = new Elysia()
  .use(Logger.into())
  .use(cors())
  .use(swagger())
  .use(staticPlugin({
    prefix: "/",
  }))
  .group('/api', (api) => 
    api
      .get("/", () => "Hello Elysia")
      .use(UserEndpoints)
      .use(VideoEndpoints)
      .use(ExternalEndpoints)
  )
  .listen(PORT);

Logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
