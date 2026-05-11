// Lightweight API client. Reads the base URL from env and injects the stub-auth header
// in development so we can exercise routes before Auth.js JWT lands (commit #20).
//
// Two env vars supported:
//   API_INTERNAL_URL    - used server-side (Next route handlers, Server Components)
//   NEXT_PUBLIC_API_URL - used client-side (browser)
// Plus DEV_USER_ID for stub-auth (set this after running `pnpm seed` to the demo user's id).

const API_BASE_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEV_USER_ID = process.env.DEV_USER_ID || process.env.NEXT_PUBLIC_DEV_USER_ID || '';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = init?.body instanceof FormData;
  // Do not set Content-Type when body is FormData - the browser must set the
  // multipart boundary automatically.
  if (!isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (DEV_USER_ID && !headers.has('x-user-id')) headers.set('x-user-id', DEV_USER_ID);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body?.error?.message) message = body.error.message;
      code = body?.error?.code;
    } catch {
      try {
        message = await res.text();
      } catch {
        // ignore
      }
    }
    throw new ApiError(res.status, message, code);
  }

  return res.json() as Promise<T>;
}
