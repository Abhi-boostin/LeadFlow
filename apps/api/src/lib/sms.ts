import { config } from '../config.js';

export class SmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmsError';
  }
}

export function isSmsConfigured(): boolean {
  return Boolean(config.FAST2SMS_API_KEY);
}

// Strip a leading +91 or 91 country code so Fast2SMS gets a bare 10-digit number.
function normaliseIndianMobile(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(/^(\+?91)/, '');
}

/**
 * Send an SMS via Fast2SMS (Quick send, route `q`).
 * Docs: https://docs.fast2sms.com/
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  if (!config.FAST2SMS_API_KEY) {
    throw new SmsError('FAST2SMS_API_KEY not configured');
  }
  const numbers = normaliseIndianMobile(phone);

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: config.FAST2SMS_API_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      route: 'q',
      message,
      numbers,
    }).toString(),
  });

  if (!res.ok) {
    throw new SmsError(`Fast2SMS HTTP ${res.status}`);
  }
  const body = (await res.json()) as { return?: boolean; message?: string[] };
  if (!body.return) {
    throw new SmsError(`Fast2SMS error: ${body.message?.[0] ?? 'unknown'}`);
  }
}
