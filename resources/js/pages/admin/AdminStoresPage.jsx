import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const STATUSES = [
    { value: '', label: t('كل المتاجر') },
    { value: 'active', label: t('نشطة') },
    { value: 'suspended', label: t('موقوفة') },
];

export function StoreStatus({ store }) {
    return store.suspended_at ? <Badge tone="danger">{t('موقوف')}</Badge> : <Badge tone="success">{t('نشط')}</Badge>;
}

/** Every store on the platform with search and status filters, and a details drawer. */
export function AdminStoresPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
    const search = useDebouncedValue(searchTerm, 300);
    const status = searchParams.get('status') ?? '';
    const page = Number(searchParams.get('page') ?? 1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const setQuery = (patch) => setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        Object.entries({ page: 1, ...patch }).forEach(([key, value]) => (value === '' || value == null || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

        return next;
    }, { replace: true });

    const load = useCallback(() => {
        setError(null);
        adminApi
            .stores({ search, status, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [search, status, page]);

    useEffect(load, [load]);

    return (
        <>
            <PageHeader title={t('المتاجر')} description={t('كل المتاجر على المنصة وحالتها')} />

            <section className="mk-card overflow-hidden">
                <div className="mk-toolbar">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم المتجر أو الرابط أو المالك...')} aria-label={t('بحث في المتاجر')} className="lg:w-96" />
                    <Select value={status} onChange={(event) => setQuery({ status: event.target.value })} aria-label={t('الحالة')} className="sm:w-48" options={STATUSES} />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل المتاجر')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2, 3].map((index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="store" title={t('لا توجد متاجر مطابقة')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    {[t('المتجر'), t('المالك'), t('الحالة'), t('المنتجات'), t('الطلبات'), t('المبيعات المسلّمة'), t('تاريخ التسجيل')].map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {result.data.map((store) => (
                                    <tr key={store.store_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => navigate(`/admin/stores/${store.store_id}`)}>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-3">
                                                <Avatar name={store.name} src={store.logo_url} size="sm" />
                                                <span>
                                                    <span className="block font-semibold text-ink">{store.name}</span>
                                                    <span className="ltr block text-start text-xs text-muted">/{store.slug}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="block text-ink">{store.owner?.full_name}</span>
                                            <span className="ltr block text-start text-xs text-muted">{store.owner?.phone}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StoreStatus store={store} />
                                        </td>
                                        <td className="px-4 py-3 text-ink-2">{formatNumber(store.products_count)}</td>
                                        <td className="px-4 py-3 text-ink-2">{formatNumber(store.orders_count)}</td>
                                        <td className="px-4 py-3 font-semibold text-ink">{formatMoney(store.delivered_sales)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(store.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>

        </>
    );
}
