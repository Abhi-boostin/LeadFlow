import { PrismaClient } from '@prisma/client';
import { createSampleLeadsForUser } from '../src/sample-data.js';

const prisma = new PrismaClient();

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function main() {
  const demoEmail = 'demo@leadflow.app';

  // Idempotency: wipe any prior demo state. Cascades clean leads/discussions/transcriptions.
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (existing) {
    await prisma.notificationLog.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      name: 'Demo Sales Rep',
      googleId: 'demo-google-id-stable',
      timezone: 'Asia/Kolkata',
      summarizationPrompt:
        'Summarise the discussion in 3 bullets. Extract any dates, money amounts, and action items.',
      onboardingCompletedAt: daysAgo(7),
    },
  });

  const result = await createSampleLeadsForUser(user.id);

  console.log('');
  console.log(
    `Seed complete: ${result.leadCount} leads, ${result.discussionCount} discussions for ${demoEmail}`,
  );
  console.log('');
  console.log(`Demo user id (paste into NEXT_PUBLIC_DEV_USER_ID in .env):`);
  console.log(`  ${user.id}`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
