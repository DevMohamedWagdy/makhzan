import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PriceCell, ProductStatusBadge, ProductThumb, StockBadge } from '@/features/products/ProductBadges';
import { useCategories } from '@/features/products/useCategories';
import { useDebouncedValue } from '@/hooks/common';
import { localized, t } from '@/i18n';
import { PER_PAGE_OPTIONS, PRODUCT_STATUSES, STOCK_LEVELS } from '@/lib/constants';
import { cn, formatNumber, formatRelative } from '@/lib/format';
import { productsApi } from '@/services/productsApi';

const FILTER_KEYS = ['search', 'category_id', 'status', 'stock', 'page', 'per_page'];
const COLUMNS = [t('المنتج'), t('القسم'), t('السعر'), t('المخزون'), t('الحالة'), t('آخر تحديث'), ''];

/** Reads list filters from the URL so filtered views survive reloads and can be linked to. */
function useProductFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo(() => {
        const values = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? '']));

        return { ...values, page: Number(values.page) || 1, per_page: Number(values.per_page) || 10 };
    }, [searchParams]);

    const setFilters = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && { page: 1 }) }).forEach(([key, value]) => {
                        value === '' || value == null || (key === 'page' && value === 1) || (key === 'per_page' && value === 10) ? next.delete(key) : next.set(key, value);
                    });

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    return { filters, setFilters, resetFilters: () => setSearchParams({}, { replace: true }) };
}

export function ProductsPage() {
    const { can } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { categories } = useCategories();
    const { filters, setFilters, resetFilters } = useProductFilters();
    const search = useDebouncedValue(filters.search, 300);
    const [result, setResult] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const latestRequest = useRef(0);

    const query = useMemo(
        () => ({ search, category_id: filters.category_id, status: filters.status, stock: filters.stock, page: filters.page, per_page: filters.per_page }),
        [search, filters.category_id, filters.status, filters.stock, filters.page, filters.per_page],
    );

    // Only the latest request may update the list: an older one (typing, paging) can come back last.
    const load = useCallback(async () => {
        const requestId = ++latestRequest.current;
        const isLatest = () => requestId === latestRequest.current;

        setLoading(true);
        setError(null);

        try {
            const [list, counts] = await Promise.all([productsApi.list(query), productsApi.summary()]);

            if (isLatest()) {
                setResult(list);
                setSummary(counts);
            }
        } catch (loadError) {
            if (isLatest()) {
                setError(loadError.message);
            }
        } finally {
            if (isLatest()) {
                setLoading(false);
            }
        }
    }, [query]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (product, status) => {
        try {
            await productsApi.update(product.product_id, toPayload(product, { status }));
            toast.success(status === 'active' ? t('تم نشر المنتج') : status === 'archived' ? t('تمت أرشفة المنتج') : t('تم تحويل المنتج لمسودة'), localized(product));
            load();
        } catch (updateError) {
            toast.error(t('تعذر تحديث المنتج'), updateError.message);
        }
    };

    const remove = async () => {
        setBusy(true);

        try {
            await productsApi.remove(deleting.product_id);
            toast.success(t('تم حذف المنتج'), localized(deleting));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر حذف المنتج'), removeError.message);
        } finally {
            setBusy(false);
        }
    };

    const hasCategories = categories === null || categories.length > 0;
    const hasActiveFilters = Boolean(filters.search || filters.category_id || filters.stock);
    const items = result?.data ?? [];

    return (
        <>
            <PageHeader
                title={t('المنتجات')}
                description={t('أضف منتجاتك بأسعارها ومقاساتها وألوانها، وتابع المخزون')}
                breadcrumbs={[t('لوحة التحكم'), t('الكتالوج'), t('المنتجات')]}
                actions={
                    <>
                        <Button variant="secondary" icon="grid" to="/dashboard/categories">
                            {t('الأقسام')}
                        </Button>
                        {can('products.create') && (
                            <Button icon="plus" to={hasCategories ? '/dashboard/products/new' : undefined} disabled={!hasCategories}>
                                {t('إضافة منتج')}
                            </Button>
                        )}
                    </>
                }
            />

            {!hasCategories && (
                <div className="mb-6">
                    <EmptyState
                        icon="grid"
                        title={t('أضف قسماً أولاً')}
                        description={t('كل منتج يجب أن يتبع قسماً. ابدأ بإضافة الأقسام التي تعمل بها، ثم أضف منتجاتك.')}
                        action={
                            <Button icon="plus" to="/dashboard/categories">
                                {t('إدارة الأقسام')}
                            </Button>
                        }
                    />
                </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('إجمالي المنتجات')} value={summary ? formatNumber(summary.total) : '—'} icon="box" tone="primary" />
                <StatCard label={t('منشور في المتجر')} value={summary ? formatNumber(summary.active) : '—'} icon="store" tone="success" />
                <StatCard label={t('مخزون منخفض')} value={summary ? formatNumber(summary.low_stock) : '—'} icon="alert-triangle" tone="warning" />
                <StatCard label={t('نفد المخزون')} value={summary ? formatNumber(summary.out_of_stock) : '—'} icon="x" tone="danger" />
            </div>

            <section className="mk-card overflow-hidden">
                <div className="border-b border-line">
                    <Tabs
                        tabs={[
                            { value: '', label: t('كل المنتجات'), count: summary?.total },
                            ...Object.entries(PRODUCT_STATUSES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] })),
                        ]}
                        value={filters.status}
                        onChange={(status) => setFilters({ status })}
                        className="border-b-0 px-3"
                    />
                </div>

                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <div className="lg:w-80">
                        <Input type="search" icon="search" value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} placeholder={t('ابحث باسم المنتج أو SKU...')} aria-label={t('بحث في المنتجات')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
                        <Select
                            aria-label={t('فلترة حسب القسم')}
                            value={filters.category_id}
                            onChange={(event) => setFilters({ category_id: event.target.value })}
                            placeholder={t('كل الأقسام')}
                            options={(categories ?? []).map((category) => ({ value: category.category_id, label: localized(category) }))}
                            className="lg:w-44"
                        />
                        <Select aria-label={t('فلترة حسب المخزون')} value={filters.stock} onChange={(event) => setFilters({ stock: event.target.value })} placeholder={t('كل حالات المخزون')} options={Object.entries(STOCK_LEVELS).map(([value, label]) => ({ value, label }))} className="lg:w-44" />
                        <Select
                            aria-label={t('عدد النتائج في الصفحة')}
                            value={filters.per_page}
                            onChange={(event) => setFilters({ per_page: Number(event.target.value) })}
                            options={PER_PAGE_OPTIONS.map((count) => ({ value: count, label: t('{count} في الصفحة', { count }) }))}
                            className="lg:w-36"
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button variant="ghost" icon="x" onClick={resetFilters} className="lg:ms-auto">
                            {t('مسح الفلاتر')}
                        </Button>
                    )}
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل المنتجات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        {hasActiveFilters || filters.status ? (
                            <EmptyState icon="search" title={t('لا توجد منتجات مطابقة')} description={t('جرّب تغيير البحث أو الفلاتر.')} action={<Button variant="secondary" onClick={resetFilters}>{t('مسح الفلاتر')}</Button>} />
                        ) : (
                            <EmptyState icon="box" title={t('لا توجد منتجات بعد')} description={t('أضف أول منتج لمتجرك بصوره وأسعاره ومقاساته.')} action={hasCategories && can('products.create') && <Button icon="plus" to="/dashboard/products/new">{t('إضافة منتج')}</Button>} />
                        )}
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className="border-y border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={cn('divide-y divide-line transition-opacity', loading && items.length > 0 && 'opacity-60')} aria-busy={loading}>
                                {loading && items.length === 0
                                    ? Array.from({ length: 5 }, (_, index) => (
                                          <tr key={index}>
                                              {COLUMNS.map((column, cell) => (
                                                  <td key={cell} className="px-4 py-4">
                                                      <Skeleton className={cell === 0 ? 'h-12 w-48' : 'h-4 w-16'} />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : items.map((product) => (
                                          <tr key={product.product_id} className="group cursor-pointer transition hover:bg-surface-2" onClick={() => navigate(`/dashboard/products/${product.product_id}`)}>
                                              <td className="px-4 py-3">
                                                  <div className="flex items-center gap-3">
                                                      <ProductThumb src={product.image_url} name={localized(product)} />
                                                      <div className="min-w-0">
                                                          <span className="block max-w-64 truncate font-semibold text-ink group-hover:text-primary">{localized(product)}</span>
                                                          <span className="text-xs text-muted">{product.options.length ? t('التركيبات: {length} · {value}', { length: product.variants.length, value: product.options.map((option) => option.name).join('، ') }) : t('بدون خيارات')}</span>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{localized(product.category)}</td>
                                              <td className="px-4 py-3">
                                                  <PriceCell product={product} />
                                              </td>
                                              <td className="px-4 py-3">
                                                  <StockBadge stock={product.stock_total} threshold={summary?.low_stock_threshold} />
                                              </td>
                                              <td className="px-4 py-3">
                                                  <ProductStatusBadge status={product.status} />
                                              </td>
                                              <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{formatRelative(product.updated_at)}</td>
                                              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                                                  <Dropdown
                                                      label={t('إجراءات {name}', { name: localized(product) })}
                                                      trigger={(props) => (
                                                          <button type="button" {...props} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink">
                                                              <Icon name="more-vertical" className="size-[18px]" />
                                                          </button>
                                                      )}
                                                      items={[
                                                          { label: t('تعديل المنتج'), icon: 'edit', onClick: () => navigate(`/dashboard/products/${product.product_id}`) },
                                                          { label: t('نشر في المتجر'), icon: 'store', tone: 'success', onClick: () => setStatus(product, 'active'), hidden: product.status === 'active' || !can('products.update') },
                                                          { label: t('تحويل لمسودة'), icon: 'eye-off', onClick: () => setStatus(product, 'draft'), hidden: product.status === 'draft' || !can('products.update') },
                                                          { label: t('أرشفة'), icon: 'box', onClick: () => setStatus(product, 'archived'), hidden: product.status === 'archived' || !can('products.update') },
                                                          { divider: true },
                                                          { label: t('حذف المنتج'), icon: 'trash', tone: 'danger', onClick: () => setDeleting(product), hidden: !can('products.delete') },
                                                      ]}
                                                  />
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {result && result.meta.total > 0 && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(page) => setFilters({ page })} />
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف «{value}»؟', { value: localized(deleting) })}
                description={t('سيختفي المنتج من لوحة التحكم والمتجر. لإيقاف بيعه مؤقتاً استخدم الأرشفة بدلاً من الحذف.')}
                confirmLabel={t('حذف المنتج')}
            />
        </>
    );
}

/**
 * Rebuilds the save payload from a listed product (used for quick status changes). Quantities
 * and cost are left out so the server keeps their current values, not the list's stale ones.
 */
export function toPayload(product, overrides = {}) {
    return {
        category_id: product.category?.category_id,
        name: product.name,
        name_en: product.name_en,
        description: product.description,
        description_en: product.description_en,
        status: product.status,
        is_featured: product.is_featured,
        options: product.options,
        variants: product.variants.map((variant) => ({
            id: variant.variant_id,
            option_values: variant.option_values,
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            sku: variant.sku,
        })),
        ...overrides,
    };
}
