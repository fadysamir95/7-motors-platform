import React from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime-dark focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-lime text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)]',
  secondary: 'bg-brand-ink text-brand-bone hover:bg-brand-ink-soft',
  outline: 'border border-border text-foreground hover:bg-slate-50',
  ghost: 'text-foreground hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  onDark: 'border border-white/30 text-brand-bone hover:bg-white/10 focus-visible:ring-brand-lime focus-visible:ring-offset-brand-ink',
};
const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const classes = (variant: Variant, size: Size, className: string) =>
  `${base} ${variants[variant]} ${sizes[size]} ${className}`;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={classes(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

/** A link styled as a button (valid HTML: no <button> nested inside <a>). */
export function ButtonLink({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
