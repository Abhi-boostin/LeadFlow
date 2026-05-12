import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-paper hover:bg-ink-soft active:bg-black font-mono uppercase tracking-label text-[10px]',
        outline:
          'border border-line bg-surface text-ink hover:bg-paper-deep font-mono uppercase tracking-label text-[10px]',
        ghost:
          'text-ink-mute hover:text-ink font-mono uppercase tracking-label text-[10px]',
        accent:
          'bg-accent text-paper hover:bg-accent-deep font-mono uppercase tracking-label text-[10px]',
        link: 'text-ink underline-offset-4 hover:underline',
        destructive:
          'bg-accent text-paper hover:bg-accent-deep font-mono uppercase tracking-label text-[10px]',
        secondary:
          'bg-paper-deep text-ink hover:bg-paper-deep/70 font-mono uppercase tracking-label text-[10px]',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-[9px]',
        lg: 'h-11 px-6 text-[11px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
