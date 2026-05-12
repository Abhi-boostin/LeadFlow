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
): Promise<{ leads: LeadCardData[]; error: string | null }> {
  const params = new URLSearchParams();
  if (searchParams.status && searchParams.status !== 'all') {
    params.set('status', searchParams.status);
  }
  if (searchParams.q) params.set('q', searchParams.q);
  const qs = params.toString();

  try {
    const data = await apiFetch<ListResponse>(`/api/v1/leads${qs ? `?${qs}` : ''}`);
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
  const { leads, error } = await fetchLeads(searchParams);

  const parsedStatus = LeadStatusSchema.safeParse(searchParams.status);
  const initialFilter: FilterValue = parsedStatus.success ? parsedStatus.data : 'all';

  // Render-time reference now. Sent to the client so initial hydration sees the same
  // value as the SSR pass — eliminates the time-relative hydration mismatch.
  const serverNow = new Date().toISOString();

  return (
    <LeadListClient
      initialLeads={leads}
      initialError={error}
      initialFilter={initialFilter}
      initialQuery={searchParams.q ?? ''}
      initialNow={serverNow}
    />
  );
}
