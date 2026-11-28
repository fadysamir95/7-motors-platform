'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    try {
      const res = await apiPost('/auth/login', { email, password });
      localStorage.setItem('token', res.accessToken);
      router.push('/admin');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">{t('login')}</h1>
      <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err ? <div className="text-red-500 text-sm">{err}</div> : null}
        <button onClick={submit} className="w-full bg-brand-lime font-semibold text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] py-2 rounded">{t('login')}</button>
      </div>
    </div>
  );
}
