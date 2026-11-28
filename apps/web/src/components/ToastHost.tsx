'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TOAST_EVENT, type ToastInput } from '@/lib/toast';
import { ArrowIcon, CheckIcon, CloseIcon } from '@/components/ui/Icons';

const DURATION_MS = 4500;

/** Renders the most recent toast (see lib/toast.ts). Mount once, near the root. */
export default function ToastHost() {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastInput>).detail;
      clearTimeout(timer.current);
      setToast({ ...detail, id: Date.now() });
      timer.current = setTimeout(() => setToast(null), DURATION_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  const error = toast.tone === 'error';
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-6 sm:justify-end">
      <div
        key={toast.id}
        role="status"
        aria-live="polite"
        className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-brand-ink p-3 ps-4 text-brand-bone shadow-[0_20px_50px_-15px_rgb(0_0_0/0.6)]"
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${error ? 'bg-red-500 text-white' : 'bg-brand-lime text-brand-ink'}`}>
          {error ? <CloseIcon width={16} height={16} strokeWidth={2.5} /> : <CheckIcon width={16} height={16} strokeWidth={2.5} />}
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{toast.message}</p>
        {toast.href && toast.actionLabel ? (
          <Link href={toast.href} onClick={() => setToast(null)} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-lime underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-lime">
            {toast.actionLabel}
            <ArrowIcon width={14} height={14} />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-bone/60 transition hover:bg-white/10 hover:text-brand-bone focus-visible:outline-2 focus-visible:outline-brand-lime"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
