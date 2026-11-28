'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import CarLoader from '@/components/ui/CarLoader';
import type { TranslationKey } from '@/lib/i18n';

type Access = 'checking' | 'signed-out' | 'forbidden' | 'ok';

const NAV: { href: string; label: TranslationKey }[] = [
  { href: '/admin', label: 'apNavDashboard' },
  { href: '/admin/products', label: 'apNavProducts' },
  { href: '/admin/orders', label: 'apNavOrders' },
  { href: '/admin/bookings', label: 'apNavBookings' },
  { href: '/admin/listings', label: 'apNavListings' },
  { href: '/admin/wholesale', label: 'apNavWholesale' },
  { href: '/admin/vehicles', label: 'apNavVehicles' },
  { href: '/admin/notifications', label: 'apNavNotifications' },
];

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETPLACE_MODERATOR', 'WHOLESALE_MANAGER'];

/**
 * Client shell for the staff area (mounted by app/admin/layout.tsx). It only decides what to show: every admin API call is authorised again on the server,
 * so this screen is a convenience, not the security boundary.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [access, setAccess] = useState<Access>('checking');

  useEffect(() => {
    let alive = true;
    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      token = null;
    }
    const decide = (next: Access) => alive && setAccess(next);
    if (!token) {
      Promise.resolve().then(() => decide('signed-out'));
    } else {
      apiGet('/auth/me')
        .then((me: { roles?: { role: { name: string } }[] }) => decide(me?.roles?.some((r) => STAFF_ROLES.includes(r.role.name)) ? 'ok' : 'forbidden'))
        .catch(() => {
          // The server did not accept the token (expired, account disabled, or tampered with): forget it.
          try {
            localStorage.removeItem('token');
          } catch {
            // Storage can be blocked; the sign-in prompt below still shows.
          }
          decide('signed-out');
        });
    }
    return () => {
      alive = false;
    };
  }, []);

  const gate =
    access === 'checking' ? (
      <div className="grid min-h-[50vh] place-items-center"><CarLoader label={t('loadingLabel')} /></div>
    ) : access !== 'ok' ? (
      <div className="container-xl py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-brand-ink">{access === 'forbidden' ? t('apForbidden') : t('apLoginRequired')}</p>
          <ButtonLink href="/login" size="lg" className="mt-6">{t('apLogin')}</ButtonLink>
        </div>
      </div>
    ) : null;

  return (
    <>
      {gate}
      {/* The page is always rendered (so Next can validate the route's instant shell and the page can start loading
          while the sign-in check runs), but stays hidden until the check passes. */}
      <div hidden={access !== 'ok'}>
        {access === 'ok' ? (
          <nav aria-label="Admin" className="border-b border-border bg-card">
            <ul className="container-xl flex gap-1 overflow-x-auto py-2">
              {NAV.map((n) => {
                const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
                return (
                  <li key={n.href} className="shrink-0">
                    <Link
                      href={n.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-lg px-3.5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand-ink ${active ? 'bg-brand-ink text-brand-bone' : 'text-brand-ink/70 hover:bg-brand-ink/10 hover:text-brand-ink'}`}
                    >
                      {t(n.label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
        {children}
      </div>
    </>
  );
}
