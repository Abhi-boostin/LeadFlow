import { signIn } from '@/auth';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign in · Leadflow',
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6">
      {/* Decorative rules */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 32px, hsl(var(--ink)) 32px 33px)',
        }}
      />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-ink/15" />
      <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-ink/15" />

      <main className="relative w-full max-w-sm">
        {/* Masthead */}
        <header className="mb-12 text-center">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
            Vol. I &nbsp; · &nbsp; Field journal for sales
          </p>
          <h1 className="font-display text-[64px] leading-[0.95] tracking-tightest text-ink">
            Leadflow
          </h1>
          <p className="mt-4 font-display italic text-[18px] text-ink-soft">
            Sign in, and pick up where the last call left off.
          </p>
        </header>

        <div className="border-y border-line bg-surface py-8 px-7 shadow-paper">
          <p className="mb-5 text-center font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
            Sign in
          </p>

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="group inline-flex h-12 w-full items-center justify-center gap-3 border border-line bg-paper px-5 font-mono text-[11px] font-medium uppercase tracking-label text-ink transition-all hover:border-ink hover:bg-paper-subtle"
            >
              <GoogleIcon />
              Continue with Google
              <span
                aria-hidden
                className="ml-1 inline-block translate-x-0 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-ink-mute">
            New here? You&apos;ll be set up in a few seconds.
            <br />
            We only ask for your name and email.
          </p>
        </div>

        <footer className="mt-8 text-center font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute/70">
          Leadflow &nbsp; · &nbsp; built quietly &nbsp; · &nbsp; ↘
        </footer>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
