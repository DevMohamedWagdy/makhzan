import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { MovementsTable } from '@/features/inventory/StockMovements';
import { useWarehouses } from '@/features/inventory/useWarehouses';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { STOCK_MOVEMENT_TYPES } from '@/lib/constants';
import { inventoryApi } from '@/services/inventoryApi';

const FILTER_KEYS = ['type', 'warehouse_id', 'search', 'from', 'to'];

/** Every stock movement in the store, newest first, filtered by type, product and date. */
export function StockMovementsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? '']));
    const page = Number(searchParams.get('page')) || 1;
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const search = useDebouncedValue(searchTerm, 300);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { warehouses } = useWarehouses();

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && { page: 1 }) }).forEach(([key, value]) => (value === '' || value == null || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    useEffect(() => {
        if (search !== filters.search) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const query = searchParams.toString();

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setResult(await inventoryApi.movements(Object.fromEntries(new URLSearchParams(query))));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        load();
    }, [load]);

    const movements = result?.data ?? [];
    const filtered = FILTER_KEYS.some((key) => filters[key]);

    return (
        <>
            <PageHeader
                title={t('سجل حركات المخزون')}
                description={t('كل تغيير في الكميات وسببه: بيع، إلغاء، مرتجع، توريد، جرد أو تالف')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون'), t('سجل الحركات')]}
                actions={
                    <Button variant="secondary" icon="warehouse" to="/dashboard/inventory">
                        {t('العودة للمخزون')}
                    </Button>
                }
            />

            <section className="mk-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم المنتج...')} aria-label={t('بحث في الحركات')} className="lg:w-72" />
                    <Select aria-label={t('نوع الحركة')} value={filters.type} onChange={(event) => setQuery({ type: event.target.value })} placeholder={t('كل الحركات')} options={Object.entries(STOCK_MOVEMENT_TYPES).map(([value, config]) => ({ value, label: config.label }))} className="w-48" />
                    {warehouses?.length > 1 && (
                        <Select aria-label={t('المخزن')} value={filters.warehouse_id} onChange={(event) => setQuery({ warehouse_id: event.target.value })} placeholder={t('كل المخازن')} options={warehouses.map((warehouse) => ({ value: String(warehouse.warehouse_id), label: warehouse.name }))} className="w-48" />
                    )}
                    <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setQuery({ from: event.target.value })} aria-label={t('من تاريخ')} className="w-40" />
                    <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setQuery({ to: event.target.value })} aria-label={t('إلى تاريخ')} className="w-40" />
                    {filtered && (
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="x"
                            onClick={() => {
                                setSearchTerm('');
                                setSearchParams({}, { replace: true });
                            }}
                        >
                            {t('مسح الفلاتر')}
                        </Button>
                    )}
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الحركات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && movements.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="refresh" title={filtered ? t('لا توجد حركات مطابقة') : t('لا توجد حركات بعد')} description={t('ستظهر هنا كل حركة على المخزون: الطلبات والتوريد والجرد والتالف.')} />
                    </div>
                ) : (
                    <MovementsTable movements={movements} loading={loading} />
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
