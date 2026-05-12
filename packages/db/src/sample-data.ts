import { LeadStatus, DiscussionSource } from './generated/index.js';
import { prisma } from './index.js';

export type SampleSeedResult = {
  leadCount: number;
  discussionCount: number;
};

type DiscussionInput = {
  note: string;
  followUpAt?: Date;
  createdAt: Date;
  source?: DiscussionSource;
};

type LeadInput = {
  name: string;
  company?: string;
  phone?: string;
  status: LeadStatus;
  discussions: DiscussionInput[];
};

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const hoursAgo = (n: number): Date => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};
const minutesAgo = (n: number): Date => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d;
};
const todayAt = (h: number, m = 0): Date => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const tomorrowAt = (h: number, m = 0): Date => {
  const d = todayAt(h, m);
  d.setDate(d.getDate() + 1);
  return d;
};

/** Returns the canonical 8-lead, 20-discussion sample set, with timestamps relative to "now". */
export function buildSampleLeads(): LeadInput[] {
  return [
    {
      name: 'Sarah Connor',
      company: 'Acme Corp',
      phone: '555-0199',
      status: LeadStatus.PROPOSAL_SENT,
      discussions: [
        { note: 'Lead created via web form.', createdAt: daysAgo(6) },
        {
          note: 'Initial discovery call. They need a CRM for 50 reps. Pain points: dropping leads, no follow-up tracking.',
          createdAt: daysAgo(5),
        },
        {
          note: 'Sent pricing tier PDF. Said she would review with her boss.',
          followUpAt: todayAt(14, 0),
          createdAt: daysAgo(2),
        },
      ],
    },
    {
      name: 'Hank Scorpio',
      company: 'Globex',
      phone: '555-0102',
      status: LeadStatus.NEW,
      discussions: [
        { note: 'Inbound lead from website contact form.', createdAt: hoursAgo(2) },
      ],
    },
    {
      name: 'Bill Lumbergh',
      company: 'Initech',
      phone: '555-0173',
      status: LeadStatus.CONTACTED,
      discussions: [
        {
          note: 'Reached out via LinkedIn DM after seeing his post about CRM frustrations.',
          createdAt: daysAgo(10),
        },
        { note: 'Left a voicemail with his assistant.', createdAt: daysAgo(7) },
      ],
    },
    {
      name: 'Bruce Wayne',
      company: 'Wayne Ent',
      phone: '555-0118',
      status: LeadStatus.WON,
      discussions: [
        {
          note: 'Referral from Lucius. Looking for an internal CRM for the philanthropy arm.',
          createdAt: daysAgo(60),
        },
        {
          note: 'Discovery call. 15 users, basic pipeline tracking, monthly reporting.',
          createdAt: daysAgo(55),
        },
        {
          note: 'Demoed the AI summaries feature. Loved it. Sent proposal worth $4,800/year.',
          createdAt: daysAgo(40),
        },
        { note: 'Negotiated to annual billing for a 12% discount.', createdAt: daysAgo(25) },
        { note: 'Contract signed. Sending welcome package.', createdAt: daysAgo(21) },
      ],
    },
    {
      name: 'Hermione Granger',
      company: 'Hogwarts Inc',
      phone: '555-0144',
      status: LeadStatus.QUALIFIED,
      discussions: [
        {
          note: 'Met at the SaaStr conference. Very enthusiastic. Took my card.',
          createdAt: daysAgo(14),
        },
        {
          note: 'Follow-up email. She replied: "Yes, let us set up a demo next week."',
          followUpAt: daysAgo(2),
          createdAt: daysAgo(10),
        },
      ],
    },
    {
      name: 'Tony Stark',
      company: 'Stark Industries',
      phone: '555-0001',
      status: LeadStatus.LOST,
      discussions: [
        {
          note: 'Cold outreach. Replied within 3 minutes asking for a demo.',
          createdAt: daysAgo(50),
        },
        {
          note: 'Demo call. Interested but kept saying "we could build this ourselves".',
          createdAt: daysAgo(45),
        },
        {
          note: 'Sent custom enterprise pricing at $24,000/year. He countered with "what does the API surface look like".',
          createdAt: daysAgo(38),
        },
        {
          note: 'Email: "Going to build internal. Catch up in 12 months when we abandon it."',
          createdAt: daysAgo(30),
        },
      ],
    },
    {
      name: 'Diana Prince',
      company: 'Themyscira Imports',
      phone: '555-0212',
      status: LeadStatus.NEW,
      discussions: [
        {
          note: 'Inbound DM on Twitter. Looking for CRM that supports SMS reminders.',
          createdAt: minutesAgo(30),
        },
      ],
    },
    {
      name: 'Clark Kent',
      company: 'Daily Planet',
      phone: '555-0177',
      status: LeadStatus.CONTACTED,
      discussions: [
        {
          note: 'Cold call. He picked up but said he was rushing to a story. Said to call back.',
          createdAt: daysAgo(3),
        },
        {
          note: 'First real call. Interested but needs publisher approval. Wants a follow-up tomorrow at 10am to walk through pricing.',
          followUpAt: tomorrowAt(10, 0),
          createdAt: hoursAgo(4),
        },
      ],
    },
  ];
}

/** Creates the canonical sample leads + discussions under the given user. */
export async function createSampleLeadsForUser(userId: string): Promise<SampleSeedResult> {
  const leads = buildSampleLeads();
  let leadCount = 0;
  let discussionCount = 0;

  for (const input of leads) {
    const sorted = [...input.discussions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const latest = sorted[0];
    if (!latest) continue;

    const created = await prisma.lead.create({
      data: {
        userId,
        name: input.name,
        company: input.company,
        phone: input.phone,
        status: input.status,
        lastDiscussionAt: latest.createdAt,
        nextFollowUpAt: latest.followUpAt ?? null,
      },
    });
    leadCount += 1;

    const chronological = [...input.discussions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const d of chronological) {
      await prisma.discussion.create({
        data: {
          leadId: created.id,
          userId,
          note: d.note,
          followUpAt: d.followUpAt ?? null,
          createdAt: d.createdAt,
          source: d.source ?? DiscussionSource.MANUAL,
        },
      });
      discussionCount += 1;
    }
  }

  return { leadCount, discussionCount };
}
