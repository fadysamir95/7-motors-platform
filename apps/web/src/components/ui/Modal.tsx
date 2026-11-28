'use client';
import { useEffect, useId, useRef } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { CloseIcon } from '@/components/ui/Icons';

/**
 * A modal built on the native <dialog>: focus is trapped, Esc and a click on the backdrop close it.
 * Mount it only while it should be open; it opens on mount and calls `onClose` once it has closed.
 */
export default function Modal({
  title,
  onClose,
  size = 'md',
  children,
}: {
  title: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-labelledby={titleId}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-3xl bg-background p-0 text-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop:bg-brand-ink/70 backdrop:backdrop-blur-sm`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
        <h2 id={titleId} className="text-xl font-extrabold text-brand-ink">{title}</h2>
        <button
          type="button"
          onClick={close}
          aria-label={t('apClose')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-ink/70 transition hover:bg-brand-ink/10 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
