import React from 'react';

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-card border border-border rounded-xl shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-5 py-4 border-b border-border ${className}`}>{children}</div>;
}

export function CardBody({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
