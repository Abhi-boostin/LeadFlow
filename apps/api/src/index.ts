import { buildServer } from './server.js';
import { config } from './config.js';
import { startCronJobs } from './jobs/index.js';

async function start() {
  const app = await buildServer();
  try {
    // Render (and most PaaS) assign a port via the PORT env var. Prefer it over API_PORT.
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.API_PORT;
    const address = await app.listen({ port, host: config.API_HOST });
    app.log.info(`LeadFlow API listening on ${address}`);
    startCronJobs(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
