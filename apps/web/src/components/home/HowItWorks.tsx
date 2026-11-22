'use client';
import { useLocale } from '@/components/LocaleProvider';
import { CheckCircleIcon, ClipboardIcon, ListIcon } from '@/components/ui/Icons';
import type { TranslationKey } from '@/lib/i18n';

const STEPS: { icon: typeof ListIcon; title: TranslationKey; desc: TranslationKey }[] = [
  { icon: ListIcon, title: 'how1Title', desc: 'how1Desc' },
  { icon: ClipboardIcon, title: 'how2Title', desc: 'how2Desc' },
  { icon: CheckCircleIcon, title: 'how3Title', desc: 'how3Desc' },
];

export default function HowItWorks() {
  const { t } = useLocale();
  return (
    <section aria-labelledby="how-title" className="container-xl py-16 md:py-20">
      <div className="mb-12 text-center">
        <h2 id="how-title" className="text-3xl font-extrabold text-brand-navy md:text-4xl">{t('howTitle')}</h2>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-brand-orange" aria-hidden="true" />
        <p className="mt-4 text-slate-600">{t('howSubtitle')}</p>
      </div>
      <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
        {/* connector line (desktop) */}
        <div className="absolute inset-x-[16%] top-8 hidden border-t-2 border-dashed border-border md:block" aria-hidden="true" />
        {STEPS.map(({ icon: Icon, title, desc }, i) => (
          <li key={title} className="relative flex flex-col items-center text-center">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-brand-navy shadow-[0_8px_24px_-12px_rgb(15_31_61/0.25)]">
                <Icon width={28} height={28} />
              </div>
              <span className="absolute -end-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-orange text-sm font-bold text-white ring-4 ring-background">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-brand-navy">{t(title)}</h3>
            <p className="mt-1.5 max-w-xs text-base leading-relaxed text-slate-600">{t(desc)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
