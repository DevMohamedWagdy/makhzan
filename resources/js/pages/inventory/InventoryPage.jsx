import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, StatCard } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { InventoryImportModal } from '@/features/inventory/InventoryImportModal';
import { EditItemModal, InventorySettingsModal, StockMovementModal, itemLabel } from '@/features/inventory/InventoryModals';
import { MovementHistoryDrawer } from '@/features/inventory/StockMovements';
import { ProductThumb } from '@/features/products/ProductBadges';
import { useCategories } from '@/features/products/useCategories';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';

const COLUMNS = [t('المنتج'), t('المخزون'), t('التكلفة'), t('سعر البيع'), t('هامش الربح'), t('قيمة المخزون'), ''];

const SORTS = [
    { value: 'name', label: t('حسب الاسم') },
    { value: 'stock_asc', label: t('الأقل مخزوناً') },
    { value: 'stock_desc', label: t('الأكثر مخزوناً') },
    { value: 'value', label: t('الأعلى قيمة') },
];

const LEVEL_BADGES = {
    out: { tone: 'danger', label: t('نفد') },
    low: { tone: 'warning', label: t('منخفض') },
    in: { tone: 'success', label: t('متوفر') },
};

function StockCell({ item }) {
    const badge = LEVEL_BADGES[item.level];

    return (
        <span className="flex flex-col items-start gap-1">
            <span className="text-base font-bold text-ink">{formatNumber(item.stock)}</span>
            <span className="flex items-center gap-1.5">
                <Badge tone={badge.tone} dot>
                    {badge.label}
                </Badge>
                <span className="text-[11px] text-muted" title={t('حد التنبيه')}>
                    {t('الحد {count}', { count: formatNumber(item.effective_threshold) })}
                </span>
            </span>
            {item.warehouses?.length > 1 && (
                <span className="flex flex-col text-[11px] text-muted">
                    {item.warehouses.map((row) => (
                        <span key={row.warehouse_id}>
                            {row.name}: <strong className="font-semibold text-ink-2">{formatNumber(row.stock)}</strong>
                        </span>
                    ))}
                </span>
            )}
        </span>
    );
}

/** Stock per variant with restock / count / write-off, cost and thresholds (?level=low|out). */
export function InventoryPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const level = searchParams.get('level') ?? '';
    const missingCost = searchParams.get('missing_cost') === '1';
    const categoryId = searchParams.get('category_id') ?? '';
    const sort = searchParams.get('sort') ?? 'name';
    const page = Number(searchParams.get('page')) || 1;
    const searchQuery = searchParams.get('search') ?? '';
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const search = useDebouncedValue(searchTerm, 300);
    const { categories } = useCategories();
    const [result, setResult] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [movement, setMovement] = useState(null);
    const [editing, setEditing] = useState(null);
    const [history, setHistory] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && { page: 1 }) }).forEach(([key, value]) =>
                        value === '' || value == null || value === false || (key === 'page' && value === 1) || (key === 'sort' && value === 'name') ? next.delete(key) : next.set(key, value === true ? '1' : value),
                    );

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    useEffect(() => {
        if (search !== searchQuery) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [list, totals] = await Promise.all([
                inventoryApi.list({ search: searchQuery, level, category_id: categoryId, missing_cost: missingCost ? 1 : undefined, sort, page }),
                inventoryApi.summary(),
            ]);

            setResult(list);
            setSummary(totals);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, level, categoryId, missingCost, sort, page]);

    useEffect(() => {
        load();
    }, [load]);

    /** Replaces the saved row in place, then refreshes counts (it may have changed level). */
    const onItemSaved = (updated) => {
        setResult((current) => current && { ...current, data: current.data.map((item) => (item.variant_id === updated.variant_id ? updated : item)) });
        setMovement(null);
        setEditing(null);
        inventoryApi.summary().then(setSummary).catch(() => {});
    };

    const items = result?.data ?? [];
    const filtered = Boolean(searchQuery || level || categoryId || missingCost);

    return (
        <>
            <PageHeader
                title={t('المخزون')}
                description={t('كميات منتجاتك وتكلفتها، وسجّل التوريد والجرد والتالف')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون والمشتريات'), t('المخزون')]}
                actions={
                    <>
                        <Button variant="secondary" icon="settings" onClick={() => setSettingsOpen(true)}>
                            {t('إعدادات المخزون')}
                        </Button>
                        <Button variant="secondary" icon="building" to="/dashboard/warehouses">
                            {t('المخازن')}
                        </Button>
                        <Button variant="secondary" icon="file-spreadsheet" onClick={() => setImportOpen(true)}>
                            {t('جرد بملف Excel')}
                        </Button>
                        <Button variant="secondary" icon="refresh" to="/dashboard/inventory/movements">
                            {t('سجل الحركات')}
                        </Button>
                        <Button icon="download" to="/dashboard/purchase-orders/new">
                            {t('أمر شراء')}
                        </Button>
                    </>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('القطع في المخزون')} value={summary ? formatNumber(summary.units) : '—'} icon="box" hint={summary && t('في {count} صنف', { count: formatNumber(summary.variants) })} />
                <StatCard
                    label={t('قيمة المخزون بالتكلفة')}
                    value={summary ? formatMoney(summary.cost_value) : '—'}
                    icon="wallet"
                    tone="info"
                    hint={summary?.missing_cost ? t('{count} صنف بدون تكلفة غير محسوب', { count: formatNumber(summary.missing_cost) }) : undefined}
                />
                <StatCard label={t('قيمة المخزون بسعر البيع')} value={summary ? formatMoney(summary.retail_value) : '—'} icon="bar-chart" tone="primary" />
                <StatCard label={t('الربح المتوقع عند البيع')} value={summary ? formatMoney(summary.expected_profit) : '—'} icon="sparkles" tone="success" hint={t('للأصناف المسجلة تكلفتها')} />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={[
                        { value: '', label: t('كل الأصناف'), count: summary?.variants },
                        { value: 'low', label: t('مخزون منخفض'), count: summary?.low },
                        { value: 'out', label: t('نفد المخزون'), count: summary?.out },
                        { value: 'in', label: t('متوفر'), count: summary?.in },
                    ]}
                    value={level}
                    onChange={(value) => setQuery({ level: value })}
                    className="px-3"
                />
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم المنتج أو SKU...')} aria-label={t('بحث في المخزون')} className="lg:w-80" />
                    <Select
                        aria-label={t('فلترة حسب القسم')}
                        value={categoryId}
                        onChange={(event) => setQuery({ category_id: event.target.value })}
                        placeholder={t('كل الأقسام')}
                        options={(categories ?? []).map((category) => ({ value: category.category_id, label: category.name }))}
                        className="w-44"
                    />
                    <Select aria-label={t('ترتيب المخزون')} value={sort} onChange={(event) => setQuery({ sort: event.target.value })} options={SORTS} icon="filter" className="w-48" />
                    {(summary?.missing_cost > 0 || missingCost) && (
                        <Button variant={missingCost ? 'soft' : 'ghost'} size="sm" icon={missingCost ? 'x' : 'alert-circle'} onClick={() => setQuery({ missing_cost: !missingCost })}>
                            {t('بدون تكلفة ({count})', { count: formatNumber(summary?.missing_cost ?? 0) })}
                        </Button>
                    )}
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل المخزون')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="warehouse"
                            title={filtered ? t('لا توجد أصناف مطابقة') : t('لا توجد منتجات بعد')}
                            description={filtered ? t('جرّب تغيير البحث أو الفلاتر.') : t('أضف منتجاتك أولاً، وستظهر كمياتها هنا.')}
                            action={!filtered && <Button icon="plus" to="/dashboard/products/new">{t('إضافة منتج')}</Button>}
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[920px] text-sm">
                            <thead className="border-y border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    {COLUMNS.map((column, index) => (
                                        <th key={index} scope="col" className={cn('px-4 py-3 text-start font-medium whitespace-nowrap', index === COLUMNS.length - 1 && 'sticky end-0 bg-surface-2')}>
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={cn('divide-y divide-line transition-opacity', loading && items.length > 0 && 'opacity-60')}>
                                {loading && items.length === 0
                                    ? Array.from({ length: 6 }, (_, index) => (
                                          <tr key={index}>
                                              {COLUMNS.map((column, columnIndex) => (
                                                  <td key={columnIndex} className="px-4 py-4">
                                                      <Skeleton className="h-4 w-16" />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : items.map((item) => (
                                          <tr key={item.variant_id} className="group transition hover:bg-surface-2">
                                              <td className="px-4 py-3">
                                                  <span className="flex items-center gap-3">
                                                      <ProductThumb src={item.image_url} name={item.product_name} className="size-10" />
                                                      <span className="min-w-0">
                                                          <span className="block font-medium text-ink">{item.product_name}</span>
                                                          <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                                                              {item.variant_title && <span>{item.variant_title}</span>}
                                                              {item.sku && <span className="ltr font-mono">{item.sku}</span>}
                                                          </span>
                                                      </span>
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3">
                                                  <StockCell item={item} />
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                  {item.cost == null ? (
                                                      <button type="button" onClick={() => setEditing(item)} className="text-xs font-medium text-warning hover:underline">
                                                          {t('أضف التكلفة')}
                                                      </button>
                                                  ) : (
                                                      <span className="text-ink-2">{formatMoney(item.cost)}</span>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatMoney(item.price)}</td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                  {item.margin == null ? <span className="text-muted">—</span> : <span className={cn('font-medium', item.margin < 0 ? 'text-danger' : 'text-ink')}>{t('{value}%', { value: formatNumber(item.margin) })}</span>}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                  <span className="block font-semibold text-ink">{item.stock_value == null ? '—' : formatMoney(item.stock_value)}</span>
                                                  <span className="text-xs text-muted">{t('بيع {value}', { value: formatMoney(item.retail_value) })}</span>
                                              </td>
                                              <td className="sticky end-0 bg-surface px-4 py-3 shadow-[0_0_12px_-6px_rgb(0_0_0/0.35)] transition group-hover:bg-surface-2">
                                                  <span className="flex items-center justify-end gap-1">
                                                      <Button size="sm" variant="soft" icon="plus" onClick={() => setMovement({ item, type: 'restock' })}>
                                                          {t('توريد')}
                                                      </Button>
                                                      <Dropdown
                                                          label={t('إجراءات {name}', { name: itemLabel(item) })}
                                                          trigger={(props) => (
                                                              <button type="button" {...props} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink">
                                                                  <Icon name="more-vertical" className="size-[18px]" />
                                                              </button>
                                                          )}
                                                          items={[
                                                              { label: t('تسوية جرد'), icon: 'check-circle', onClick: () => setMovement({ item, type: 'adjustment' }) },
                                                              { label: t('تسجيل تالف أو مفقود'), icon: 'alert-triangle', onClick: () => setMovement({ item, type: 'damage' }), disabled: item.stock === 0 },
                                                              { label: t('التكلفة وحد التنبيه'), icon: 'edit', onClick: () => setEditing(item) },
                                                              { label: t('سجل الحركات'), icon: 'refresh', onClick: () => setHistory(item) },
                                                              { divider: true },
                                                              { label: t('فتح المنتج'), icon: 'box', onClick: () => navigate(`/dashboard/products/${item.product_id}`) },
                                                          ]}
                                                      />
                                                  </span>
                                              </td>
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

            <StockMovementModal item={movement?.item} initialType={movement?.type} onClose={() => setMovement(null)} onSaved={onItemSaved} />
            <EditItemModal item={editing} storeThreshold={summary?.low_stock_threshold ?? 5} onClose={() => setEditing(null)} onSaved={onItemSaved} />
            <MovementHistoryDrawer item={history} onClose={() => setHistory(null)} />
            <InventoryImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
            <InventorySettingsModal
                open={settingsOpen}
                threshold={summary?.low_stock_threshold}
                onClose={() => setSettingsOpen(false)}
                onSaved={() => {
                    setSettingsOpen(false);
                    load();
                }}
            />
        </>
    );
}
