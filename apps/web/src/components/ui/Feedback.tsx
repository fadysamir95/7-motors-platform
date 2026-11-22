import React from 'react';

export function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'orange' | 'blue' | 'red' }) {
  const tones: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">📦</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="text-muted mt-1">{description}</p> : null}
    </div>
  );
}
