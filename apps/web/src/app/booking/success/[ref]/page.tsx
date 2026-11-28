'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowIcon, CalendarIcon, CarIcon, CheckIcon, PhoneIcon } from '@/components/ui/Icons';

type Summary = {
  ref: string;
  date?: string;
  startTime?: string;
  services?: string[];
  plate?: string;
  orderNumber?: string;
};

function readSummary(ref: string): Summary | null {
  try {
    const raw = sessionStorage.getItem('lastBooking');
    const parsed = raw ? (JSON.parse(raw) as Summary) : null;
    return parsed && parsed.ref === ref ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Booking confirmation. It has its own address, so a reload or the browser's back button never re-submits the form.
 * The details come from the summary the booking form stored for this visit; without it the page still confirms
 * the booking using its reference.
 */
export default function BookingSuccessPage() {
  const params = useParams();
  const ref = decodeURIComponent(String(params?.ref ?? ''));
  const { t, locale } = useLocale();
  const [booking, setBooking] = useState<Summary | null | undefined>(undefined);

  useEffect(() => {
    Promise.resolve().then(() => setBooking(readSummary(ref)));
  }, [ref]);

  if (booking === undefined) return <div className="min-h-[50vh]" aria-busy="true" />;

  const when =
    booking?.date && booking.startTime
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${booking.date}T12:00:00`))
      : null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('bkRef'), value: <span className="font-mono text-sm font-bold" dir="ltr">{ref}</span> },
    ...(when ? [{ label: t('bkWhenLabel'), value: <>{when} · <span dir="ltr">{booking?.startTime}</span></> }] : []),
    ...(booking?.services?.length ? [{ label: t('bkServices'), value: booking.services.join('، ') }] : []),
    ...(booking?.plate ? [{ label: t('licenseNumber'), value: booking.plate }] : []),
    ...(booking?.orderNumber ? [{ label: t('orderNumber'), value: <span className="font-mono font-bold" dir="ltr">{booking.orderNumber}</span> }] : []),
  ];

  const steps = [
    { icon: <PhoneIcon width={20} height={20} />, text: t('bkStep1') },
    { icon: <CarIcon width={20} height={20} />, text: t('bkStep2') },
    { icon: <CalendarIcon width={20} height={20} />, text: t('bkStep3') },
  ];

  return (
    <div>
      <section className="bg-brand-ink text-brand-bone">
        <div className="container-xl py-8 md:py-10">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{t('booking')}</h1>
        </div>
      </section>

      <div className="container-xl py-10 md:py-14">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-lime text-brand-ink shadow-[0_0_0_10px_rgb(198_245_63/0.25)]">
            <CheckIcon width={38} height={38} strokeWidth={2.5} />
          </div>
          <h2 className="font-display mt-6 text-3xl font-extrabold text-brand-ink md:text-4xl">{t('bkSuccessTitle')}</h2>
          <p className="mt-2 text-muted">{t('bkSuccessDesc')}</p>

          <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card text-start shadow-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="shrink-0 text-sm text-muted">{r.label}</dt>
                <dd className="min-w-0 text-end font-semibold text-brand-ink">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 rounded-2xl bg-brand-ink p-6 text-start text-brand-bone">
            <h3 className="text-lg font-extrabold">{t('bkNextTitle')}</h3>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-bone/85">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-lime text-brand-ink">{s.icon}</span>
                  <span className="pt-1.5">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
              {t('cartEmptyCta')}
              <ArrowIcon width={16} height={16} />
            </ButtonLink>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-brand-ink">
              <Link href="/booking" className="underline underline-offset-4">{t('bkAnother')}</Link>
              <Link href="/" className="underline underline-offset-4">{t('home')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
