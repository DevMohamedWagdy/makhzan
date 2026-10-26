import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { t } from '@/i18n';
import { STOCK_MOVEMENT_TYPES } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';
import { itemLabel } from './InventoryModals';

export function MovementTypeBadge({ type }) {
    const config = STOCK_MOVEMENT_TYPES[type] ?? { label: type, tone: 'neutral' };

    return (
        <Badge tone={config.tone} icon={config.icon}>
            {config.label}
        </Badge>
    );
}

/** "+30" in green or "−3" in red; the sign carries the direction, not only the color. */
export function QuantityChange({ value }) {
    return <span className={cn('ltr inline-block font-semibold', value > 0 ? 'text-success' : 'text-danger')}>{`${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`}</span>;
}

/** Where a movement came from: its order, a note, or who recorded it. */
function MovementSource({ movement }) {
    return (
        <span className="flex flex-col gap-0.5 text-xs">
            {movement.order && (
                <Link to={`/dashboard/orders?order=${movement.order.order_id}`} className="font-medium text-primary hover:underline">
                    {t('الطلب #{number}', { number: movement.order.number })}
                </Link>
            )}
            {movement.transfer && <span className="font-medium text-info">{t('تحويل #{number}', { number: movement.transfer.number })}</span>}
            {movement.purchase_order && (
                <Link to={`/dashboard/purchase-orders/${movement.purchase_order.purchase_order_id}`} className="font-medium text-primary hover:underline">
                    {t('أمر الشراء #{number}', { number: movement.purchase_order.number })}
                </Link>
            )}
            {movement.note && !movement.purchase_order && <span className="text-ink-2">{movement.note}</span>}
            {!movement.order && !movement.purchase_order && !movement.transfer && !movement.note && <span className="text-muted">{movement.actor === 'customer' ? t('العميل') : t('المتجر')}</span>}
            {movement.type === 'restock' && movement.unit_cost != null && <span className="text-muted">{t('تكلفة القطعة {value}', { value: formatMoney(movement.unit_cost) })}</span>}
        </span>
    );
}

/** Movements as a table; `showProduct` adds the product column for the store-wide log. */
export function MovementsTable({ movements, loading, showProduct = true }) {
    const columns = [t('التاريخ'), ...(showProduct ? [t('المنتج')] : []), t('الحركة'), t('المخزن'), t('الكمية'), t('المخزون'), t('المصدر')];

    return (
        <div className="mk-scroll overflow-x-auto">
            <table className={cn('w-full text-sm', showProduct ? 'min-w-[820px]' : 'min-w-[560px]')}>
                <thead className="mk-thead">
                    <tr>
                        {columns.map((column) => (
                            <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={cn('divide-y divide-line transition-opacity', loading && movements.length > 0 && 'opacity-60')}>
                    {loading && movements.length === 0
                        ? Array.from({ length: 5 }, (_, index) => (
                              <tr key={index}>
                                  {columns.map((column) => (
                                      <td key={column} className="px-4 py-4">
                                          <Skeleton className="h-4 w-16" />
                                      </td>
                                  ))}
                              </tr>
                          ))
                        : movements.map((movement) => (
                              <tr key={movement.movement_id}>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="block text-ink">{formatDate(movement.created_at)}</span>
                                      <span className="text-xs text-muted">{formatRelative(movement.created_at)}</span>
                                  </td>
                                  {showProduct && (
                                      <td className="px-4 py-3">
                                          <span className="block font-medium text-ink">{movement.product_name}</span>
                                          {movement.variant_title && <span className="text-xs text-muted">{movement.variant_title}</span>}
                                      </td>
                                  )}
                                  <td className="px-4 py-3">
                                      <MovementTypeBadge type={movement.type} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{movement.warehouse?.name ?? '—'}</td>
                                  <td className="px-4 py-3">
                                      <QuantityChange value={movement.quantity} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">
                                      <span className="ltr inline-block">
                                          {formatNumber(movement.stock_before)} → <strong className="text-ink">{formatNumber(movement.stock_after)}</strong>
                                      </span>
                                      {movement.warehouse_stock_after != null && movement.warehouse_stock_after !== movement.stock_after && (
                                          <span className="block text-2xs text-muted">
                                              {t('في المخزن: {before} → {after}', { before: formatNumber(movement.warehouse_stock_before), after: formatNumber(movement.warehouse_stock_after) })}
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-4 py-3">
                                      <MovementSource movement={movement} />
                                  </td>
                              </tr>
                          ))}
                </tbody>
            </table>
        </div>
    );
}

/** One variant's movement history, newest first. */
export function MovementHistoryDrawer({ item, onClose }) {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setPage(1);
        setResult(null);
    }, [item?.variant_id]);

    useEffect(() => {
        if (!item) {
            return;
        }

        setError(null);
        inventoryApi
            .movements({ variant_id: item.variant_id, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [item, page]);

    return (
        <Drawer open={Boolean(item)} onClose={onClose} size="lg" icon="refresh" title={t('سجل حركات المخزون')} description={item ? itemLabel(item) : undefined}>
            {error ? (
                <p className="m-6 rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-danger">{error}</p>
            ) : result && result.data.length === 0 ? (
                <p className="m-6 rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لا توجد حركات مسجلة لهذا المنتج بعد.')}</p>
            ) : (
                <>
                    <MovementsTable movements={result?.data ?? []} loading={!result} showProduct={false} />
                    {result && result.meta.last_page > 1 && (
                        <div className="border-t border-line px-4 py-3">
                            <Pagination meta={result.meta} onPageChange={setPage} />
                        </div>
                    )}
                </>
            )}
        </Drawer>
    );
}
