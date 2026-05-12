import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LeadListClient } from '@/components/lead-list-client';
import { apiFetch, ApiError } from '@/lib/api';
import { LeadStatusSchema } from '@leadflow/shared';
import type { LeadCardData } from '@/components/lead-card';
import type { FilterValue } from '@/components/filter-chips';

export const dynamic = 'force-dynamic';

type SearchParams = { status?: string; q?: string };
type ListResponse = { leads: LeadCardData[] };

async function fetchLeads(
  searchParams: SearchParams,
  userId: string,
): Promise<{ leads: LeadCardData[]; error: string | null }> {
  const params = new URLSearchParams();
  if (searchParams.status && searchParams.status !== 'all') {
    params.set('status', searchParams.status);
  }
  if (searchParams.q) params.set('q', searchParams.q);
  const qs = params.toString();

  try {
    const data = await apiFetch<ListResponse>(`/api/v1/leads${qs ? `?${qs}` : ''}`, {
      userId,
    });
    return { leads: data.leads ?? [], error: null };
  } catch (e) {
    const message =
      e instanceof ApiError
        ? `${e.status} ${e.message}`
        : e instanceof Error
          ? e.message
          : 'Unknown error';
    return { leads: [], error: message };
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const { leads, error } = await fetchLeads(searchParams, userId);

  const parsedStatus = LeadStatusSchema.safeParse(searchParams.status);
  const initialFilter: FilterValue = parsedStatus.success ? parsedStatus.data : 'all';

  const serverNow = new Date().toISOString();

  return (
    <LeadListClient
      initialLeads={leads}
      initialError={error}
      initialFilter={initialFilter}
      initialQuery={searchParams.q ?? ''}
      initialNow={serverNow}
      currentUser={{
        id: userId,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    />
  );
}
