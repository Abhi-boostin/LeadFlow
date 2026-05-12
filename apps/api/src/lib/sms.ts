// =============================================================================
// SMS via Fast2SMS — DISABLED (feature-gated until client confirms demand).
// =============================================================================
// The original implementation called Fast2SMS's `bulkV2` endpoint to send
// daily digests and follow-up reminders. We're keeping the User.smsNumber /
// smsOptIn columns and NotificationLog table in the schema so the data shape
// survives, but the actual network call is commented out and the helpers are
// no-ops. To revive: uncomment the block below and re-enable the cron jobs
// in apps/api/src/jobs/index.ts.
// =============================================================================

import { config } from '../config.js';

export class SmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmsError';
  }
}

// Force-disabled while the SMS feature is parked. Returning false short-circuits
// the cron scheduler so no notifications are attempted even if FAST2SMS_API_KEY
// is set in the environment.
export function isSmsConfigured(): boolean {
  return false;
  // return Boolean(config.FAST2SMS_API_KEY);
}

/**
 * Send an SMS — no-op while the feature is disabled.
 * Original Fast2SMS call kept below for easy revival.
 */
export async function sendSms(_phone: string, _message: string): Promise<void> {
  // SMS sending is disabled. Reference config so the import is still used and
  // the compiler doesn't complain when callers exist elsewhere.
  void config;
  return;

  // ----- ORIGINAL IMPLEMENTATION (commented out) -----
  // // Strip a leading +91 or 91 country code so Fast2SMS gets a bare 10-digit number.
  // const numbers = _phone.replace(/[\s-]/g, '').replace(/^(\+?91)/, '');
  //
  // if (!config.FAST2SMS_API_KEY) {
  //   throw new SmsError('FAST2SMS_API_KEY not configured');
  // }
  //
  // const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
  //   method: 'POST',
  //   headers: {
  //     authorization: config.FAST2SMS_API_KEY,
  //     'content-type': 'application/x-www-form-urlencoded',
  //   },
  //   body: new URLSearchParams({
  //     route: 'q',
  //     message: _message,
  //     numbers,
  //   }).toString(),
  // });
  //
  // if (!res.ok) {
  //   throw new SmsError(`Fast2SMS HTTP ${res.status}`);
  // }
  // const body = (await res.json()) as { return?: boolean; message?: string[] };
  // if (!body.return) {
  //   throw new SmsError(`Fast2SMS error: ${body.message?.[0] ?? 'unknown'}`);
  // }
}
