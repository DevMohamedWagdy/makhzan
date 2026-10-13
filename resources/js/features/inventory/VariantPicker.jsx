import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ProductThumb } from '@/features/products/ProductBadges';
import { useClickOutside, useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';
import { itemLabel } from './InventoryModals';

/**
 * Search box that finds the store's variants by name or SKU and adds the chosen one.
 * `stockOf(item)` replaces the stock shown per result (e.g. one warehouse's quantity).
 */
export function VariantPicker({ excludedIds, onPick, stockOf = (item) => item.stock, placeholder = t('ابحث عن منتج بالاسم أو SKU لإضافته...') }) {
    const [term, setTerm] = useState('');
    const search = useDebouncedValue(term, 250);
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useClickOutside(containerRef, () => setOpen(false), open);

    useEffect(() => {
        if (!open) {
            return;
        }

        setResults(null);
        inventoryApi
            .list({ search, per_page: 20 })
            .then((response) => setResults(response.data))
            .catch(() => setResults([]));
    }, [search, open]);

    const available = (results ?? []).filter((item) => !excludedIds.includes(item.variant_id));

    return (
        <div ref={containerRef} className="relative">
            <Input
                type="search"
                icon="search"
                value={term}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                    setTerm(event.target.value);
                    setOpen(true);
                }}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {open && (
                <div className="mk-card mk-scroll absolute inset-x-0 top-12 z-20 max-h-80 overflow-y-auto p-1.5 shadow-pop">
                    {results === null ? (
                        <div className="grid place-items-center p-6">
                            <Spinner className="size-5" />
                        </div>
                    ) : available.length === 0 ? (
                        <p className="p-4 text-center text-sm text-muted">{t('لا توجد منتجات مطابقة.')}</p>
                    ) : (
                        available.map((item) => (
                            <button
                                key={item.variant_id}
                                type="button"
                                onClick={() => {
                                    onPick(item);
                                    setTerm('');
                                    setOpen(false);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-surface-3"
                            >
                                <ProductThumb src={item.image_url} name={item.product_name} className="size-9" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">{itemLabel(item)}</span>
                                    <span className="text-xs text-muted">
                                        {t('المخزون {count}', { count: formatNumber(stockOf(item)) })}
                                        {item.cost != null && ` · ${t('التكلفة {value}', { value: formatMoney(item.cost) })}`}
                                    </span>
                                </span>
                                <Icon name="plus" className="size-4 text-primary" />
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
