import { useCallback, useEffect, useState } from 'react';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { formatDate, formatRelative, formatTime } from '@/lib/format';
import { ACTOR_TYPES, EVENT_FILTERS, actorLabel, actorTypeLabel, eventLabel, eventTone } from './activityLabels';

function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * The activity log with filters (event, who did it, text, dates) and a drawer showing what
 * changed. `load(filters)` fetches a page; `fixed` filters (e.g. a store) are always applied.
 */
export function ActivityLogList({ load, fixed = {}, showStore = false, compact = false }) {
    const [filters, setFilters] = useState({ event: '', actor_type: '', from: '', to: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(null);
    const fixedKey = JSON.stringify(fixed);

    const fetchPage = useCallback(() => {
        setError(null);
        load({ ...JSON.parse(fixedKey), ...filters, search, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [load, fixedKey, filters, search, page]);

    useEffect(fetchPage, [fetchPage]);

    const setFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    return (
        <>
            {!compact && (
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم المنفذ أو العنصر...')} aria-label={t('بحث في السجل')} className="lg:w-72" />
                    <Select value={filters.event} onChange={(event) => setFilter('event', event.target.value)} aria-label={t('الحدث')} className="sm:w-44" options={EVENT_FILTERS} />
                    <Select value={filters.actor_type} onChange={(event) => setFilter('actor_type', event.target.value)} aria-label={t('المنفذ')} className="sm:w-44" options={ACTOR_TYPES} />
                    <Input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} aria-label={t('من تاريخ')} className="sm:w-40" />
                    <Input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} aria-label={t('إلى تاريخ')} className="sm:w-40" />
                </div>
            )}

            {error ? (
                <div className="p-6">
                    <EmptyState icon="alert-triangle" title={t('تعذر تحميل السجل')} description={error} action={<Button variant="secondary" icon="refresh" onClick={fetchPage}>{t('إعادة المحاولة')}</Button>} />
                </div>
            ) : !result ? (
                <div className="flex flex-col gap-2 p-4">
                    {[0, 1, 2, 3].map((index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))}
                </div>
            ) : result.data.length === 0 ? (
                <div className="p-6">
                    <EmptyState icon="clock" title={t('لا يوجد نشاط مطابق')} />
                </div>
            ) : (
                <ul className="divide-y divide-line border-t border-line">
                    {result.data.map((log) => (
                        <li key={log.log_id}>
                            <button type="button" onClick={() => setOpen(log)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-start text-sm transition hover:bg-surface-2">
                                <Badge tone={eventTone(log.event)}>{eventLabel(log.event)}</Badge>
                                <span className="min-w-0 flex-1 truncate font-medium text-ink">{log.subject.label ?? '—'}</span>
                                {showStore && log.store && <span className="text-xs text-muted">{log.store.name}</span>}
                                <span className="text-xs text-ink-2">{actorLabel(log.actor)}</span>
                                <span className="w-24 shrink-0 text-end text-xs text-muted" title={formatDate(log.created_at)}>
                                    {formatRelative(log.created_at)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!compact && result && result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}

            <Drawer open={Boolean(open)} onClose={() => setOpen(null)} icon="clock" title={open ? eventLabel(open.event) : ''} description={open ? `${formatDate(open.created_at)} · ${formatTime(open.created_at)}` : undefined}>
                {open && (
                    <div className="flex flex-col gap-5 p-6 text-sm">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                            <dt className="text-muted">{t('العنصر')}</dt>
                            <dd className="font-medium text-ink">{open.subject.label ?? '—'} {open.subject.id && <span className="text-xs text-muted">#{open.subject.id}</span>}</dd>
                            <dt className="text-muted">{t('المنفذ')}</dt>
                            <dd className="text-ink">
                                {actorLabel(open.actor)} <span className="text-xs text-muted">({actorTypeLabel(open.actor.type)})</span>
                            </dd>
                            {open.store && (
                                <>
                                    <dt className="text-muted">{t('المتجر')}</dt>
                                    <dd className="text-ink">{open.store.name}</dd>
                                </>
                            )}
                            {open.ip && (
                                <>
                                    <dt className="text-muted">{t('عنوان IP')}</dt>
                                    <dd className="ltr text-start font-mono text-xs text-ink">{open.ip}</dd>
                                </>
                            )}
                            {open.user_agent && (
                                <>
                                    <dt className="text-muted">{t('الجهاز')}</dt>
                                    <dd className="ltr text-start text-xs break-all text-ink-2">{open.user_agent}</dd>
                                </>
                            )}
                        </dl>

                        {open.changes && (
                            <div className="overflow-hidden rounded-xl border border-line">
                                <table className="w-full text-xs">
                                    <thead className="mk-thead">
                                        <tr>
                                            <th className="px-3 py-2 text-start font-medium">{t('الحقل')}</th>
                                            {open.changes.old && <th className="px-3 py-2 text-start font-medium">{t('قبل')}</th>}
                                            <th className="px-3 py-2 text-start font-medium">{open.changes.old ? t('بعد') : t('القيمة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {Object.keys(open.changes.new ?? {}).map((field) => (
                                            <tr key={field}>
                                                <td className="ltr px-3 py-2 text-start font-mono text-ink-2">{field}</td>
                                                {open.changes.old && <td className="px-3 py-2 break-all text-danger">{formatValue(open.changes.old[field])}</td>}
                                                <td className="px-3 py-2 break-all text-success">{formatValue(open.changes.new[field])}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </>
    );
}
