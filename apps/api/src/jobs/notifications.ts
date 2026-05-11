import { prisma } from '@leadflow/db';
import { sendSms } from '../lib/sms.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Returns the hour-of-day (0-23) for `now` in the given IANA timezone.
 */
function localHour(now: Date, timezone: string): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: timezone,
      }).format(now),
      10,
    );
  } catch {
    // Invalid timezone string -> fall back to UTC.
    return now.getUTCHours();
  }
}

/**
 * Daily digest of today's follow-ups. Run every hour; fires per user whose local hour is 7am.
 * Idempotent via NotificationLog (only one digest per user per 24h).
 */
export async function sendDailyDigest(now: Date = new Date()): Promise<{ sent: number }> {
  const users = await prisma.user.findMany({
    where: { smsOptIn: true, smsNumber: { not: null } },
  });

  let sent = 0;

  for (const user of users) {
    if (localHour(now, user.timezone) !== 7) continue;

    const recent = await prisma.notificationLog.findFirst({
      where: {
        userId: user.id,
        kind: 'daily_digest',
        sentAt: { gt: new Date(now.getTime() - DAY_MS) },
      },
    });
    if (recent) continue;

    // Today's window in the user's local time.
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const todayLeads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        nextFollowUpAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['WON', 'LOST'] },
      },
      orderBy: { nextFollowUpAt: 'asc' },
      take: 10,
    });
    if (todayLeads.length === 0) continue;

    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: user.timezone,
    });

    const lines = todayLeads.slice(0, 3).map((l) => {
      const time = l.nextFollowUpAt ? formatter.format(l.nextFollowUpAt) : '';
      return `${l.name} ${time}`.trim();
    });
    const more = todayLeads.length > 3 ? ` +${todayLeads.length - 3} more` : '';
    const msg = `LeadFlow: ${todayLeads.length} follow-up${todayLeads.length === 1 ? '' : 's'} today — ${lines.join(', ')}${more}`;

    try {
      await sendSms(user.smsNumber!, msg.slice(0, 160));
      await prisma.notificationLog.create({
        data: { userId: user.id, kind: 'daily_digest', channel: 'sms' },
      });
      sent += 1;
    } catch (err) {
      // Log via stderr so the cron runner picks it up; do not throw and abort the whole batch.
      console.error(`Daily digest failed for user ${user.id}:`, err);
    }
  }

  return { sent };
}

/**
 * 1-hour-before reminders. Run every 5 minutes; finds discussions with follow-ups in the next
 * 60-65 minute window. Idempotent per (user, lead) within a 2-hour scope.
 */
export async function sendFollowUpReminders(
  now: Date = new Date(),
): Promise<{ sent: number }> {
  const windowStart = new Date(now.getTime() + 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  const discussions = await prisma.discussion.findMany({
    where: { followUpAt: { gte: windowStart, lte: windowEnd } },
    include: { lead: true, user: true },
  });

  let sent = 0;

  for (const d of discussions) {
    if (!d.user.smsOptIn || !d.user.smsNumber) continue;
    if (!d.followUpAt) continue;

    const existing = await prisma.notificationLog.findFirst({
      where: {
        userId: d.userId,
        kind: 'follow_up_reminder',
        targetLeadId: d.leadId,
        sentAt: { gt: new Date(now.getTime() - 2 * HOUR_MS) },
      },
    });
    if (existing) continue;

    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: d.user.timezone,
    });
    const time = formatter.format(d.followUpAt);
    const snippet = d.note.length > 80 ? `${d.note.slice(0, 77)}...` : d.note;
    const msg = `LeadFlow: Follow-up with ${d.lead.name} at ${time}. ${snippet}`;

    try {
      await sendSms(d.user.smsNumber, msg.slice(0, 160));
      await prisma.notificationLog.create({
        data: {
          userId: d.userId,
          kind: 'follow_up_reminder',
          channel: 'sms',
          targetLeadId: d.leadId,
        },
      });
      sent += 1;
    } catch (err) {
      console.error(`Reminder failed for discussion ${d.id}:`, err);
    }
  }

  return { sent };
}
