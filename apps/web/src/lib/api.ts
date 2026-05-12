// Lightweight API client. Reads the base URL from env and injects the stub-auth header
// in development so we can exercise routes before real auth lands.
//
// Env vars:
//   API_INTERNAL_URL        - used server-side (Server Components)
//   NEXT_PUBLIC_API_URL     - used client-side (browser)
//   NEXT_PUBLIC_DEV_USER_ID - stub auth user id (run `pnpm seed`, paste the printed id here)

const API_BASE_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '';

// Module-scope user id for client-side calls. LeadListClient sets this from the session
// on mount so every browser-initiated fetch carries the signed-in user's id.
let currentUserId: string | undefined;
export function setApiUserId(id: string | undefined) {
  currentUserId = id;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ApiFetchOptions extends RequestInit {
  /** Explicit user id, used by Server Components which have access to the session. */
  userId?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = init?.body instanceof FormData;
  const hasBody = init?.body !== undefined && init?.body !== null;
  // Only set Content-Type when actually sending a JSON body. Setting it on an empty POST
  // triggers Fastify's FST_ERR_CTP_EMPTY_JSON_BODY (e.g. /summarize takes no body).
  // FormData bodies must also let the browser set the multipart boundary automatically.
  if (hasBody && !isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  // Resolution order: explicit > client-side session > NEXT_PUBLIC_DEV_USER_ID fallback.
  const userId = init?.userId ?? currentUserId ?? DEV_USER_ID;
  if (userId && !headers.has('x-user-id')) headers.set('x-user-id', userId);

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
