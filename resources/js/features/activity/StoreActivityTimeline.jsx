import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar, EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Navigation';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/common';
import { intlLocale, t } from '@/i18n';
import { cn, formatDate, formatTime } from '@/lib/format';
import { request } from '@/services/client';
import { STORE_EVENT_FILTERS, describeEntry, entryChanges, entryKind } from './storeActivity';

const TONES = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    primary: 'bg-primary-soft text-primary',
    info: 'bg-info-soft text-info',
    warning: 'bg-warning-soft text-warning',
    neutral: 'bg-surface-3 text-ink-2',
};

/** Changes shown under an entry; the rest are in its details. */
const INLINE_CHANGES = 3;

const loadActivity = (filters) => request('GET', '/api/v1/vendor/activity', { query: filters });

/** "اليوم", "أمس" or the weekday and date, for a day's heading. */
function dayLabel(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return t('اليوم');
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return t('أمس');
    }

    return new Intl.DateTimeFormat(intlLocale, { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(date);
}

/** Entries in days, newest first: [{ key, label, logs }]. */
function groupByDay(logs) {
    const days = [];

    for (const log of logs) {
        const date = new Date(log.created_at);
        const key = date.toDateString();

        if (days.at(-1)?.key !== key) {
            days.push({ key, label: dayLabel(date), logs: [] });
        }

        days.at(-1).logs.push(log);
    }

    return days;
}

function Sentence({ log }) {
    const { action, subject, label } = describeEntry(log);

    return (
        <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">{log.actor.name ?? t('عضو محذوف')}</span> {action}
            {subject && <> {subject}</>}
            {label && <> <span className="font-semibold text-ink">{label}</span></>}
        </p>
    );
}

function ChangeChips({ changes }) {
    if (changes.length === 0) {
        return null;
    }

    return (
        <ul className="mt-2 flex flex-wrap gap-1.5">
            {changes.slice(0, INLINE_CHANGES).map((change) => (
                <li key={change.field} className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-surface-2 px-2 py-1 text-xs ring-1 ring-line ring-inset">
                    <span className="text-muted">{change.label}:</span>
                    {change.before !== null && (
                        <>
                            <span className="break-words text-ink-2 line-through decoration-danger/50">{change.before}</span>
                            <Icon name="arrow-left" className="size-3 shrink-0 text-muted" />
                        </>
                    )}
                    <span className="break-words font-medium text-ink">{change.after}</span>
                </li>
            ))}
            {changes.length > INLINE_CHANGES && <li className="self-center text-xs text-muted">{t('+{count} تغيير', { count: changes.length - INLINE_CHANGES })}</li>}
        </ul>
    );
}

/**
 * The store's activity log as a timeline: what each team member did, grouped by day, each entry
 * a sentence with its main changes; a click opens every detail. Filters: text, area, team
 * member and dates.
 */
export function StoreActivityTimeline() {
    const [filters, setFilters] = useState({ event: '', actor_id: '', from: '', to: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(null);

    const fetchPage = useCallback(() => {
        setError(null);
        loadActivity({ ...filters, search, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [filters, search, page]);

    useEffect(fetchPage, [fetchPage]);

    const setFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    const days = useMemo(() => groupByDay(result?.data ?? []), [result]);
    const members = result?.members ?? [];
    const isFiltered = Boolean(search || filters.event || filters.actor_id || filters.from || filters.to);

    return (
        <>
            <section className="mk-card overflow-hidden">
                <div className="mk-toolbar">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم عضو الفريق أو العنصر...')} aria-label={t('بحث في السجل')} className="lg:w-72" />
                    <Select value={filters.event} onChange={(event) => setFilter('event', event.target.value)} aria-label={t('القسم')} className="sm:w-48" options={STORE_EVENT_FILTERS} />
                    <Select
                        value={filters.actor_id}
                        onChange={(event) => setFilter('actor_id', event.target.value)}
                        aria-label={t('عضو الفريق')}
                        className="sm:w-48"
                        options={[{ value: '', label: t('كل أعضاء الفريق') }, ...members.map((member) => ({ value: String(member.vendor_id), label: member.name ?? t('عضو محذوف') }))]}
                    />
                    <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilter('from', event.target.value)} aria-label={t('من تاريخ')} className="sm:w-40" />
                    <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilter('to', event.target.value)} aria-label={t('إلى تاريخ')} className="sm:w-40" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل السجل')} description={error} action={<Button variant="secondary" icon="refresh" onClick={fetchPage}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-4 border-t border-line p-5">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="flex items-start gap-3">
                                <Skeleton className="size-9 shrink-0 rounded-lg" />
                                <div className="flex flex-1 flex-col gap-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : days.length === 0 ? (
                    <div className="border-t border-line p-6">
                        <EmptyState icon="clock" title={isFiltered ? t('لا يوجد نشاط مطابق') : t('لا يوجد نشاط بعد')} description={isFiltered ? t('جرّب تغيير الفلاتر أو الفترة.') : t('ستظهر هنا إجراءات فريقك: إضافة المنتجات وتعديلها، وتغيير حالات الطلبات، والإعدادات وغيرها.')} />
                    </div>
                ) : (
                    <div className="border-t border-line">
                        {days.map((day) => (
                            <section key={day.key}>
                                <h2 className="sticky top-0 z-[1] flex items-center gap-2 border-b border-line bg-surface-2/95 px-5 py-2 text-xs font-semibold text-ink-2 backdrop-blur">
                                    <Icon name="clock" className="size-3.5 text-muted" />
                                    {day.label}
                                    <span className="font-normal text-muted">· {t('{count} إجراء', { count: day.logs.length })}</span>
                                </h2>
                                <ol className="divide-y divide-line">
                                    {day.logs.map((log) => {
                                        const kind = entryKind(log.event);

                                        return (
                                            <li key={log.log_id}>
                                                <button type="button" onClick={() => setOpen(log)} className="group flex w-full items-start gap-3 px-5 py-3.5 text-start transition hover:bg-surface-2">
                                                    <span className="relative shrink-0">
                                                        <Avatar name={log.actor.name ?? '?'} size="sm" />
                                                        <span className={cn('absolute -end-1 -bottom-1 grid size-[18px] place-items-center rounded-full ring-2 ring-surface', TONES[kind.tone])}>
                                                            <Icon name={kind.icon} className="size-2.5" strokeWidth={3} />
                                                        </span>
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <Sentence log={log} />
                                                        <ChangeChips changes={entryChanges(log)} />
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs text-muted">
                                                        <span className="mk-num" title={formatDate(log.created_at)}>{formatTime(log.created_at)}</span>
                                                        <Icon name="chevron-left" className="size-4 opacity-0 transition group-hover:opacity-100" />
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </section>
                        ))}
                    </div>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>

            {result?.retention_days && <p className="mt-3 text-center text-xs text-muted">{t('يحتفظ السجل بإجراءات الفريق لآخر {days} يوماً، ثم تُحذف تلقائياً.', { days: result.retention_days })}</p>}

            <Drawer open={Boolean(open)} onClose={() => setOpen(null)} icon={open ? entryKind(open.event).icon : 'clock'} title={t('تفاصيل الإجراء')} description={open ? `${formatDate(open.created_at)} · ${formatTime(open.created_at)}` : undefined}>
                {open && <EntryDetails log={open} />}
            </Drawer>
        </>
    );
}

function EntryDetails({ log }) {
    const changes = entryChanges(log);

    return (
        <div className="flex flex-col gap-5 p-6 text-sm">
            <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-4">
                <Avatar name={log.actor.name ?? '?'} size="md" />
                <Sentence log={log} />
            </div>

            {changes.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-xs">
                        <thead className="mk-thead">
                            <tr>
                                <th className="px-3 py-2 text-start font-medium">{t('الحقل')}</th>
                                {log.changes.old && <th className="px-3 py-2 text-start font-medium">{t('قبل')}</th>}
                                <th className="px-3 py-2 text-start font-medium">{log.changes.old ? t('بعد') : t('القيمة')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {changes.map((change) => (
                                <tr key={change.field}>
                                    <td className="px-3 py-2 text-ink-2">{change.label}</td>
                                    {log.changes.old && <td className="px-3 py-2 break-all text-danger">{change.before}</td>}
                                    <td className="px-3 py-2 break-all text-success">{change.after}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(log.ip || log.user_agent) && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                    {log.ip && (
                        <>
                            <dt className="text-muted">{t('عنوان IP')}</dt>
                            <dd className="ltr text-start font-mono text-ink">{log.ip}</dd>
                        </>
                    )}
                    {log.user_agent && (
                        <>
                            <dt className="text-muted">{t('الجهاز')}</dt>
                            <dd className="ltr text-start break-all text-ink-2">{log.user_agent}</dd>
                        </>
                    )}
                </dl>
            )}
        </div>
    );
}
