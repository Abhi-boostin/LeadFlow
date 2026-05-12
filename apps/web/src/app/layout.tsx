import type { Metadata } from 'next';
import { Instrument_Serif, Onest, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const onest = Onest({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-onest',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Leadflow — a field journal for sales',
  description:
    'Track leads, log every discussion, never miss a follow-up. AI-augmented, calm, opinionated.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${onest.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        {children}
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            unstyled: false,
            classNames: {
              toast:
                'group toast bg-surface border border-line text-ink rounded-none shadow-lift font-sans',
              title: 'text-[13px] font-medium tracking-tight',
              description: 'text-[12px] text-muted-foreground',
              actionButton:
                'font-mono text-[10px] uppercase tracking-label bg-ink text-paper',
              cancelButton:
                'font-mono text-[10px] uppercase tracking-label text-muted-foreground',
            },
          }}
        />
      </body>
    </html>
  );
}
