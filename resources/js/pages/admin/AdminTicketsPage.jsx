import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { TICKET_TYPES } from '@/features/support/support';
import { TicketList } from '@/features/support/TicketList';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

const TYPE_OPTIONS = [{ value: '', label: t('كل الأنواع') }, ...Object.entries(TICKET_TYPES).map(([value, type]) => ({ value, label: type.label }))];

/** Every store's support tickets: who's waiting on the team, by type, store or text. */
export function AdminTicketsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') ?? 'awaiting';
    const type = searchParams.get('type') ?? '';
    const storeId = searchParams.get('store_id') ?? '';
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const debouncedSearch = useDebouncedValue(search);

    const setFilter = (key, value) => {
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);

                value ? next.set(key, value) : next.delete(key);

                return next;
            },
            { replace: true },
        );
        setPage(1);
    };

    const load = useCallback(() => {
        setError(null);
        adminApi
            .tickets({
                status: tab === 'open' || tab === 'closed' ? tab : '',
                awaiting_reply: tab === 'awaiting' ? 1 : '',
                type,
                store_id: storeId,
                search: debouncedSearch,
                page,
            })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [tab, type, storeId, debouncedSearch, page]);

    useEffect(load, [load]);

    const summary = result?.summary;
    const tabs = [
        { value: 'awaiting', label: t('بانتظار الرد'), count: summary?.awaiting_reply },
        { value: 'open', label: t('مفتوحة'), count: summary?.open },
        { value: 'closed', label: t('مغلقة'), count: summary?.closed },
        { value: 'all', label: t('الكل'), count: summary?.total },
    ];
    const storeOptions = [{ value: '', label: t('كل المتاجر') }, ...(result?.stores ?? []).map((store) => ({ value: String(store.store_id), label: store.name }))];

    return (
        <>
            <PageHeader title={t('تذاكر الدعم الفني')} description={t('مشاكل التجار واقتراحاتهم؛ ابدأ بالتذاكر التي تنتظر رد الفريق')} />

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={tab} onChange={(value) => setFilter('tab', value === 'awaiting' ? '' : value)} className="px-3" />
                <div className="flex flex-col gap-3 p-4 lg:flex-row">
                    <div className="w-full lg:max-w-sm">
                        <Input
                            icon="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder={t('العنوان أو اسم المتجر أو رقم التذكرة')}
                            aria-label={t('بحث')}
                        />
                    </div>
                    <div className="w-full lg:w-44">
                        <Select options={TYPE_OPTIONS} value={type} onChange={(event) => setFilter('type', event.target.value)} aria-label={t('نوع التذكرة')} />
                    </div>
                    <div className="w-full lg:w-56">
                        <Select options={storeOptions} value={storeId} onChange={(event) => setFilter('store_id', event.target.value)} aria-label={t('المتجر')} />
                    </div>
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل التذاكر')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 border-t border-line p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="border-t border-line p-6">
                        <EmptyState icon="message-square" title={tab === 'awaiting' && !type && !storeId && !debouncedSearch ? t('لا توجد تذاكر تنتظر الرد') : t('لا توجد تذاكر مطابقة')} />
                    </div>
                ) : (
                    <TicketList tickets={result.data} viewer="admin" linkTo={(ticket) => `/admin/support/${ticket.ticket_id}`} />
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>
        </>
    );
}
