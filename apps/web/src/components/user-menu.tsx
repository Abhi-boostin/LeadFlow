'use client';
import { ChevronDown, LogOut, Settings as SettingsIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/app/actions';

export function UserMenu({
  user,
  onOpenSettings,
}: {
  user: { name: string | null; email: string; image: string | null };
  onOpenSettings: () => void;
}) {
  const initials = (user.name ?? user.email)
    .split(/[^\w]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Profile menu"
          className="group inline-flex h-9 items-center gap-2 border border-line bg-paper pl-1 pr-2 transition-colors hover:bg-paper-subtle"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-7 w-7 object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center bg-ink font-mono text-[10px] font-medium uppercase tracking-label text-paper">
              {initials || '?'}
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-ink-mute transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border border-line bg-surface p-0 shadow-lift">
        <div className="border-b border-line px-3 py-3">
          <p className="font-display text-[16px] leading-tight text-ink truncate">
            {user.name ?? 'Unnamed'}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-label text-ink-mute truncate">
            {user.email}
          </p>
        </div>
        <DropdownMenuItem
          onSelect={() => onOpenSettings()}
          className="flex cursor-pointer items-center gap-2 px-3 py-2 font-sans text-[13px]"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          AI preferences
        </DropdownMenuItem>
        <div className="border-t border-line">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-sans text-[13px] text-accent transition-colors hover:bg-paper-subtle"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
