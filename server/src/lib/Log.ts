import { createPinoLogger } from "@bogeychan/elysia-logger";

const LEVEL = Bun.env.LOG_LEVEL || "debug";

const Logger = createPinoLogger( {
  level: LEVEL,
});

Logger.info(`log level set to ${LEVEL}`);

export default Logger;