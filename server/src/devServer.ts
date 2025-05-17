// cause im being lazy and want to use the testcontainers pg for dev
import Logger from "./lib/Log";
import { setupDockerTestDb } from "./lib/SetupFor.test";

// import { loadLokiData } from "./migrate";

const setup = await setupDockerTestDb();

const stop = setup.stop;

Logger.info('db detected online, starting server');

async function startDev() {
  const server = await import('./index');
}

await startDev();

const die = async () => {
  Logger.warn('shutting down from signal');
  await stop();
  Logger.warn('db down');
  // await app.stop();
  // Logger.warn('app down');
  process.exit();
}

process.on("SIGINT", async () => {
  await die();
});

process.on("SIGKILL", async () => {
  await die();
});


