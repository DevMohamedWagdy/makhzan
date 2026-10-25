import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

/** Stores for the "which store" filter, loaded once per page view. */
let storeOptionsPromise = null;

function useStoreOptions(enabled) {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        storeOptionsPromise ??= adminApi
            .stores({ per_page: 100 })
            .then((result) => result.data.map((store) => ({ value: String(store.store_id), label: store.name })))
            .catch(() => {
                storeOptionsPromise = null;

                return [];
            });
        storeOptionsPromise.then(setOptions);
    }, [enabled]);

    return options;
}

/**
 * A platform-wide list for the admin panel: search, a store filter (unless `storeId` pins one
 * store), extra select filters, a table and pagination. Rows open `onRowClick`.
 *
 * @param {{
 *   load: (params: object) => Promise<{ data: object[], meta: object }>,
 *   columns: Array<{ label: string, render: (row: object) => any, className?: string }>,
 *   rowKey: (row: object) => string|number,
 *   storeId?: number|null,
 *   searchPlaceholder?: string,
 *   filters?: Array<{ key: string, label: string, options: Array<{ value: string, label: string }> }>,
 *   onRowClick?: (row: object) => void,
 *   emptyIcon?: string,
 *   emptyTitle?: string,
 *   minWidth?: string,
 *   reloadKey?: any,
 *   renderSummary?: (result: object) => any,
 * }} props
 */
export function AdminDataTable({ load, columns, rowKey, storeId = null, searchPlaceholder, filters = [], onRowClick, emptyIcon = 'search', emptyTitle, minWidth = '860px', reloadKey, renderSummary }) {
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [values, setValues] = useState(() => Object.fromEntries(filters.map((filter) => [filter.key, ''])));
    const [store, setStore] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const storeOptions = useStoreOptions(!storeId);

    const fetchPage = useCallback(() => {
        setError(null);
        load({ ...values, search: searchPlaceholder ? search : undefined, store_id: storeId ?? (store || undefined), page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values, search, store, storeId, page, reloadKey]);

    useEffect(fetchPage, [fetchPage]);

    const change = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const visibleColumns = columns.filter((column) => !(storeId && column.storeColumn));

    return (
        <>
            {renderSummary && result && renderSummary(result)}
            <div className="flex flex-wrap items-center gap-3 p-4">
                {searchPlaceholder && <Input type="search" icon="search" value={searchTerm} onChange={(event) => change(setSearchTerm)(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="lg:w-80" />}
                {!storeId && storeOptions.length > 0 && <Select value={store} onChange={(event) => change(setStore)(event.target.value)} aria-label={t('المتجر')} className="sm:w-48" options={[{ value: '', label: t('كل المتاجر') }, ...storeOptions]} />}
                {filters.map((filter) => (
                    <Select key={filter.key} value={values[filter.key]} onChange={(event) => change(setValues)((current) => ({ ...current, [filter.key]: event.target.value }))} aria-label={filter.label} className="sm:w-44" options={filter.options} />
                ))}
            </div>

            {error ? (
                <div className="p-6">
                    <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={fetchPage}>{t('إعادة المحاولة')}</Button>} />
                </div>
            ) : !result ? (
                <div className="flex flex-col gap-2 p-4">
                    {[0, 1, 2, 3].map((index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))}
                </div>
            ) : result.data.length === 0 ? (
                <div className="p-6">
                    <EmptyState icon={emptyIcon} title={emptyTitle ?? t('لا توجد نتائج')} />
                </div>
            ) : (
                <div className="mk-scroll overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth }}>
                        <thead className="mk-thead">
                            <tr>
                                {visibleColumns.map((column) => (
                                    <th key={column.label} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {result.data.map((row) => (
                                <tr key={rowKey(row)} className={cn('transition', onRowClick && 'cursor-pointer hover:bg-surface-2')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                                    {visibleColumns.map((column) => (
                                        <td key={column.label} className={cn('px-4 py-3 align-middle', column.className)}>
                                            {column.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result && result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}
        </>
    );
}

/** The store column most admin lists show (hidden on a store's own page). */
export const storeColumn = {
    label: t('المتجر'),
    storeColumn: true,
    className: 'whitespace-nowrap text-ink-2',
    render: (row) => row.store?.name ?? '—',
};
