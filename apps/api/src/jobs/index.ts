import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
// SMS feature parked — imports kept commented so the original wiring is obvious
// when we bring it back.
// import { Cron } from 'croner';
// import { isSmsConfigured } from '../lib/sms.js';
// import { sendDailyDigest, sendFollowUpReminders } from './notifications.js';

let started = false;

/**
 * Cron jobs entry point. Currently a no-op because the SMS notification feature
 * is parked. The scheduler block below is preserved (commented) so reviving it
 * is just uncommenting + restoring the imports above.
 */
export function startCronJobs(app: FastifyInstance): void {
  if (!config.CRON_ENABLED) {
    app.log.info('CRON_ENABLED=false - cron jobs skipped');
    return;
  }
  if (started) return;
  started = true;

  app.log.info('SMS cron jobs disabled (feature parked). Nothing scheduled.');

  // ----- ORIGINAL SCHEDULER (commented out) -----
  // if (!isSmsConfigured()) {
  //   app.log.warn('FAST2SMS_API_KEY not set - SMS cron jobs disabled');
  //   return;
  // }
  //
  // // Hourly check; per-user timezone filter decides who actually gets a 7am digest.
  // new Cron('0 * * * *', async () => {
  //   try {
  //     const { sent } = await sendDailyDigest();
  //     if (sent > 0) app.log.info({ sent }, 'Daily digest cron sent SMS messages');
  //   } catch (err) {
  //     app.log.error({ err }, 'Daily digest cron failed');
  //   }
  // });
  //
  // // Every 5 minutes for the 60-65 minute reminder window.
  // new Cron('*/5 * * * *', async () => {
  //   try {
  //     const { sent } = await sendFollowUpReminders();
  //     if (sent > 0) app.log.info({ sent }, 'Reminder cron sent SMS messages');
  //   } catch (err) {
  //     app.log.error({ err }, 'Reminder cron failed');
  //   }
  // });
  //
  // app.log.info('SMS cron jobs scheduled (daily digest hourly, reminders every 5min)');
}
