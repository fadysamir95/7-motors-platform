'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { csvToImportRows, IMPORT_COLUMNS, IMPORT_TEMPLATE } from '@/lib/csv';
import { useLocale } from '@/components/LocaleProvider';
import Modal from '@/components/ui/Modal';
import CarLoader from '@/components/ui/CarLoader';
import { CheckIcon } from '@/components/ui/Icons';

type RowResult = { row: number; sku: string; status: 'created' | 'updated' | 'error'; errors?: string[] };
type Report = { dryRun: boolean; summary: { created: number; updated: number; failed: number }; results: RowResult[] };

const MAX_ROWS = 500;

/**
 * CSV import in two steps: "Check" runs the server's dry run so nothing is written, then "Import" applies it.
 * Rows with errors are skipped and listed; the good ones still go through.
 */
export default function ImportDialog({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { t } = useLocale();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [final, setFinal] = useState<Report | null>(null);
  const [busy, setBusy] = useState<'check' | 'run' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reset = () => {
    setRows(null);
    setReport(null);
    setFinal(null);
    setProblem(null);
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setText(await file.text());
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([`\uFEFF${IMPORT_TEMPLATE}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const check = async () => {
    reset();
    const parsed = csvToImportRows(text);
    if (!parsed.rows.length) return setProblem(t('apImportEmpty'));
    if (!parsed.hasSku) return setProblem(t('apImportNoSku'));
    if (parsed.rows.length > MAX_ROWS) return setProblem(t('apImportTooMany'));
    setBusy('check');
    try {
      setReport(await apiPost('/products/import', { rows: parsed.rows, dryRun: true }));
      setRows(parsed.rows);
    } catch {
      setProblem(t('apImportFailed'));
    } finally {
      setBusy(null);
    }
  };

  const run = async () => {
    if (!rows) return;
    setBusy('run');
    try {
      setFinal(await apiPost('/products/import', { rows }));
      onDone();
    } catch {
      setProblem(t('apImportFailed'));
    } finally {
      setBusy(null);
    }
  };

  const shown = final ?? report;
  const failed = shown?.results.filter((r) => r.status === 'error') ?? [];
  const importable = report ? report.summary.created + report.summary.updated : 0;

  return (
    <Modal title={t('apImportTitle')} onClose={onClose} size="lg">
      <div className="space-y-5 px-6 py-5">
        {!final ? (
          <>
            <p className="text-sm text-muted">{t('apImportHelp')}</p>
            <div className="rounded-xl bg-slate-100 p-4 text-sm">
              <p className="font-bold text-brand-ink">{t('apImportColumns')}</p>
              <p className="mt-1 break-words font-mono text-xs text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>{IMPORT_COLUMNS.join(', ')}</p>
              <p className="mt-2 text-muted">{t('apImportColumnsHint')}</p>
              <button type="button" onClick={downloadTemplate} className="mt-3 font-bold text-brand-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-ink">{t('apImportTemplate')}</button>
            </div>

            <div>
              <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border-2 border-dashed border-border px-4 text-sm font-bold text-brand-ink transition hover:border-brand-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink">
                {t('apImportChoose')}
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void load(e.target.files?.[0])} />
              </label>
              <label htmlFor="import-text" className="mt-3 block text-sm text-muted">{t('apImportPaste')}</label>
              <textarea id="import-text" rows={5} value={text} onChange={(e) => { setText(e.target.value); reset(); }} dir="ltr" spellCheck={false} className="mt-1.5 w-full rounded-xl border border-border bg-card p-3 font-mono text-xs text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40" style={{ textAlign: 'start' }} />
            </div>

            {problem ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{problem}</p> : null}

            {busy === 'check' ? <div className="grid place-items-center py-3"><CarLoader size="xs" label={t('apImportChecking')} /></div> : null}

            {report ? (
              <div aria-live="polite" className="rounded-xl border border-border bg-card p-4">
                <p className="font-bold text-brand-ink">{t('apImportRows').replace('{n}', String(report.results.length))}</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
                  <li className="rounded-full bg-green-100 px-3 py-1 text-green-800">{t('apImportWillCreate').replace('{n}', String(report.summary.created))}</li>
                  <li className="rounded-full bg-brand-ink/10 px-3 py-1 text-brand-ink">{t('apImportWillUpdate').replace('{n}', String(report.summary.updated))}</li>
                  {report.summary.failed ? <li className="rounded-full bg-red-100 px-3 py-1 text-red-800">{t('apImportWithErrors').replace('{n}', String(report.summary.failed))}</li> : null}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div role="status" className="flex items-start gap-3 rounded-xl bg-brand-lime/25 p-4 text-brand-ink">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-ink text-brand-lime"><CheckIcon width={18} height={18} strokeWidth={3} /></span>
            <p className="pt-1.5 font-bold">
              {t('apImportDone').replace('{c}', String(final.summary.created)).replace('{u}', String(final.summary.updated)).replace('{f}', String(final.summary.failed))}
            </p>
          </div>
        )}

        {failed.length ? (
          <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            {failed.slice(0, 100).map((r) => (
              <li key={r.row}>
                <span className="font-bold text-red-900">{t('apImportRow').replace('{n}', String(r.row))}{r.sku ? ` · ${r.sku}` : ''}</span>
                <span className="block text-red-800" dir="ltr" style={{ textAlign: 'start' }}>{r.errors?.join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          {final ? (
            <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-lg bg-brand-ink px-8 font-semibold text-brand-bone transition hover:bg-brand-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink">{t('apClose')}</button>
          ) : (
            <>
              <button type="button" onClick={check} disabled={!text.trim() || busy !== null} className="inline-flex h-12 items-center rounded-lg border-2 border-brand-ink px-6 font-semibold text-brand-ink transition hover:bg-brand-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-50">
                {t('apImportCheck')}
              </button>
              <button type="button" onClick={run} disabled={!report || importable === 0 || busy !== null} className="inline-flex h-12 items-center rounded-lg bg-brand-lime px-6 font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-50">
                {busy === 'run' ? t('apImportRunning') : t('apImportRun').replace('{n}', String(importable))}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
