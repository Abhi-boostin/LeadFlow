import { buildServer } from './server.js';
import { config } from './config.js';

async function start() {
  const app = await buildServer();
  try {
    const address = await app.listen({ port: config.API_PORT, host: config.API_HOST });
    app.log.info(`LeadFlow API listening on ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
