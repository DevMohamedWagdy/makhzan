import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';
import { VendorEditModal } from './VendorEditModal';

const TYPES = [
    { value: '', label: t('كل الحسابات') },
    { value: 'owner', label: t('أصحاب المتاجر') },
    { value: 'staff', label: t('موظفو المتاجر') },
];

/** Dashboard accounts (owners and staff), optionally of one store, with editing. */
export function AdminVendorsTable({ storeId = null }) {
    const { can } = useAdminAuth();
    const [type, setType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .vendors({ search, type, page, store_id: storeId })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [search, type, page, storeId]);

    useEffect(load, [load]);

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 p-4">
                <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('الاسم أو البريد أو الهاتف...')} aria-label={t('بحث في الحسابات')} className="lg:w-80" />
                <Select
                    value={type}
                    onChange={(event) => {
                        setType(event.target.value);
                        setPage(1);
                    }}
                    aria-label={t('نوع الحساب')}
                    className="sm:w-48"
                    options={TYPES}
                />
            </div>

            {error ? (
                <div className="p-6">
                    <EmptyState icon="alert-triangle" title={t('تعذر تحميل الحسابات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                </div>
            ) : !result ? (
                <div className="flex flex-col gap-2 p-4">
                    {[0, 1, 2].map((index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                    ))}
                </div>
            ) : result.data.length === 0 ? (
                <div className="p-6">
                    <EmptyState icon="users" title={t('لا توجد حسابات مطابقة')} />
                </div>
            ) : (
                <ul className="divide-y divide-line border-t border-line">
                    {result.data.map((vendor) => (
                        <li key={vendor.vendor_id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                            <Avatar name={vendor.full_name} size="md" />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                                    {vendor.full_name}
                                    <Badge tone={vendor.type === 'owner' ? 'primary' : 'info'}>{vendor.type === 'owner' ? t('صاحب متجر') : (vendor.role ?? t('موظف'))}</Badge>
                                    {!vendor.is_active && <Badge tone="danger">{t('موقوف')}</Badge>}
                                </p>
                                <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                                    <span className="ltr">{vendor.phone}</span>
                                    <span className="ltr">{vendor.email}</span>
                                    <span>{vendor.last_login_at ? t('آخر دخول {time}', { time: formatRelative(vendor.last_login_at) }) : t('لم يسجّل دخول بعد')}</span>
                                </p>
                            </div>
                            {!storeId && vendor.store && (
                                <Link to={`/admin/stores/${vendor.store.store_id}`} className="text-sm text-ink-2 hover:text-primary">
                                    {vendor.store.name}
                                </Link>
                            )}
                            {can('vendors.update') && <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditing(vendor)} aria-label={t('تعديل {name}', { name: vendor.full_name })} />}
                        </li>
                    ))}
                </ul>
            )}

            {result && result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}

            <VendorEditModal
                vendor={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null);
                    load();
                }}
            />
        </>
    );
}
