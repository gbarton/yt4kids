// cause im being lazy and want to use the testcontainers pg for dev
import Logger from "./lib/Log";
import { setupDockerTestDb } from "./lib/SetupFor.test";
import { User } from "./lib/routes/User";
import { migrateDB } from "./db/DB";

// import { loadLokiData } from "./migrate";

const setup = await setupDockerTestDb();

const stop = setup.stop;

Logger.info('db detected online, starting server');

async function seedAdminUser() {
  // Ensure migrations run first
  await migrateDB();

  const userManager = new User();
  const email = "admin@example.com";
  const displayName = "admin";
  const password = "admin";

  if (await userManager.exists(email)) {
    Logger.info('admin user already exists, skipping seed');
    return;
  }

  const result = await userManager.register(password, {
    displayName,
    email,
    admin: true,
  });

  if (result.success) {
    Logger.info('seeded admin user: admin@example.com / admin');
  } else {
    Logger.warn('failed to seed admin user:', result.message);
  }
}

await seedAdminUser();

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


