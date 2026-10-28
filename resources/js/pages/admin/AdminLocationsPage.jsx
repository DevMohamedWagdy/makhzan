import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Field, Input, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { localized, t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { loadLocations } from '@/lib/locations';
import { adminApi } from '@/services/adminApi';

const EMPTY_ENTRY = { name: '', name_en: '', is_active: true };

/**
 * Governorates and cities stores deliver to: the governorates on one side (searchable), the selected one's
 * cities on the other. Inactive entries stay on old orders but leave every form; ones in use can't be deleted.
 */
export function AdminLocationsPage() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const canUpdate = can('locations.update');
    const [governorates, setGovernorates] = useState(null);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .locations()
            .then((list) => {
                setGovernorates(list);
                setSelectedId((current) => current ?? list[0]?.id ?? null);
            })
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(load, [load]);

    /** Applies a change, takes the refreshed list it answers with, and refreshes the app-wide list too. */
    const apply = async (change, successMessage) => {
        setBusy(true);

        try {
            const list = await change();

            setGovernorates(list);
            loadLocations();
            toast.success(successMessage);

            return true;
        } catch (changeError) {
            toast.error(t('تعذر حفظ التغيير'), Object.values(changeError.errors ?? {})[0] ?? changeError.message);

            return false;
        } finally {
            setBusy(false);
        }
    };

    const selected = governorates?.find((governorate) => governorate.id === selectedId) ?? null;
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return (governorates ?? []).filter((governorate) => !term || governorate.name.includes(term) || governorate.name_en?.toLowerCase().includes(term));
    }, [governorates, search]);

    const totals = useMemo(
        () => ({
            governorates: governorates?.length ?? 0,
            active: governorates?.filter((governorate) => governorate.is_active).length ?? 0,
            cities: governorates?.reduce((sum, governorate) => sum + governorate.cities.length, 0) ?? 0,
        }),
        [governorates],
    );

    const save = async (values) => {
        const { kind, entry, governorateId } = editing;
        const isNew = !entry;
        const saved = await apply(
            () =>
                kind === 'governorate'
                    ? isNew
                        ? adminApi.createGovernorate(values)
                        : adminApi.updateGovernorate(entry.id, values)
                    : isNew
                      ? adminApi.createCity(governorateId, values)
                      : adminApi.updateCity(entry.id, values),
            isNew ? (kind === 'governorate' ? t('تمت إضافة المحافظة') : t('تمت إضافة المدينة')) : t('تم حفظ التعديلات'),
        );

        if (saved) {
            setEditing(null);
        }
    };

    const remove = async () => {
        const { kind, entry } = deleting;
        const removed = await apply(() => (kind === 'governorate' ? adminApi.deleteGovernorate(entry.id) : adminApi.deleteCity(entry.id)), kind === 'governorate' ? t('تم حذف المحافظة') : t('تم حذف المدينة'));

        if (removed) {
            setDeleting(null);

            if (kind === 'governorate') {
                setSelectedId(null);
            }
        }
    };

    return (
        <>
            <PageHeader
                title={t('المحافظات والمدن')}
                icon="map-pin"
                description={t('الأماكن التي تشحن لها المتاجر. المحافظة أو المدينة الموقوفة تختفي من النماذج وتبقى ظاهرة في الطلبات القديمة.')}
                breadcrumbs={[t('الإدارة'), t('المحافظات والمدن')]}
                actions={
                    canUpdate && (
                        <Button icon="plus" onClick={() => setEditing({ kind: 'governorate', entry: null })}>
                            {t('إضافة محافظة')}
                        </Button>
                    )
                }
            />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل المحافظات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !governorates ? (
                <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                    <Skeleton className="h-[520px] rounded-2xl" />
                    <Skeleton className="h-[520px] rounded-2xl" />
                </div>
            ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
                    <section className="mk-card overflow-hidden lg:sticky lg:top-24">
                        <div className="border-b border-line p-3">
                            <Input type="search" icon="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('ابحث عن محافظة...')} aria-label={t('بحث في المحافظات')} />
                            <p className="mt-2.5 px-1 text-xs text-muted">
                                {t('{active} محافظة مفعّلة من {total} · {cities} مدينة', { active: formatNumber(totals.active), total: formatNumber(totals.governorates), cities: formatNumber(totals.cities) })}
                            </p>
                        </div>
                        <ul className="mk-scroll max-h-[560px] overflow-y-auto p-2">
                            {filtered.map((governorate) => (
                                <li key={governorate.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(governorate.id)}
                                        aria-current={governorate.id === selectedId ? 'true' : undefined}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition',
                                            governorate.id === selectedId ? 'bg-primary-soft font-semibold text-primary' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                                        )}
                                    >
                                        <span className={cn('size-2 shrink-0 rounded-full', governorate.is_active ? 'bg-success' : 'bg-line-strong')} />
                                        <span className="min-w-0 flex-1 truncate">{localized(governorate)}</span>
                                        <span className="mk-num text-xs text-muted">{formatNumber(governorate.cities.length)}</span>
                                    </button>
                                </li>
                            ))}
                            {filtered.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">{t('لا توجد نتائج')}</li>}
                        </ul>
                    </section>

                    {selected ? (
                        <GovernorateDetails
                            governorate={selected}
                            canUpdate={canUpdate}
                            busy={busy}
                            onEdit={(kind, entry) => setEditing({ kind, entry, governorateId: selected.id })}
                            onDelete={(kind, entry) => setDeleting({ kind, entry })}
                            onToggle={(kind, entry) =>
                                apply(
                                    () => (kind === 'governorate' ? adminApi.updateGovernorate(entry.id, { is_active: !entry.is_active }) : adminApi.updateCity(entry.id, { is_active: !entry.is_active })),
                                    entry.is_active ? t('تم إيقاف «{name}»', { name: localized(entry) }) : t('تم تفعيل «{name}»', { name: localized(entry) }),
                                )
                            }
                        />
                    ) : (
                        <div className="mk-card">
                            <EmptyState icon="map-pin" title={t('اختر محافظة')} description={t('اختر محافظة من القائمة لعرض مدنها وتعديلها.')} />
                        </div>
                    )}
                </div>
            )}

            <LocationFormModal editing={editing} busy={busy} onClose={() => setEditing(null)} onSave={save} />

            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف «{name}»؟', { name: localized(deleting?.entry) })}
                description={deleting?.kind === 'governorate' ? t('ستُحذف المحافظة ومدنها. المحافظات المستخدمة في متاجر أو طلبات لا تُحذف، أوقفها بدلاً من ذلك.') : t('المدن المستخدمة في متاجر أو طلبات لا تُحذف، أوقفها بدلاً من ذلك.')}
                confirmLabel={t('حذف')}
            />
        </>
    );
}

/** The selected governorate: its names and status with actions, then its cities as a list. */
function GovernorateDetails({ governorate, canUpdate, busy, onEdit, onDelete, onToggle }) {
    return (
        <section className="mk-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-4 border-b border-line p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="map-pin" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                        {governorate.name}
                        <Badge tone={governorate.is_active ? 'success' : 'neutral'} dot>
                            {governorate.is_active ? t('مفعّلة') : t('موقوفة')}
                        </Badge>
                    </h2>
                    <p className="text-sm text-muted">
                        <span dir="ltr">{governorate.name_en || '—'}</span>
                        <span className="mx-1.5">·</span>
                        <span dir="ltr" className="font-mono text-xs">{governorate.id}</span>
                    </p>
                </div>
                {canUpdate && (
                    <div className="flex items-center gap-2">
                        <Switch checked={governorate.is_active} onChange={() => onToggle('governorate', governorate)} disabled={busy} ariaLabel={t('تفعيل المحافظة')} />
                        <Button variant="secondary" size="sm" icon="edit" onClick={() => onEdit('governorate', governorate)}>
                            {t('تعديل')}
                        </Button>
                        <Button variant="danger-soft" size="sm" icon="trash" onClick={() => onDelete('governorate', governorate)} aria-label={t('حذف المحافظة')} />
                    </div>
                )}
            </header>

            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold text-ink">{t('المدن ({count})', { count: formatNumber(governorate.cities.length) })}</h3>
                {canUpdate && (
                    <Button variant="soft" size="sm" icon="plus" onClick={() => onEdit('city', null)}>
                        {t('إضافة مدينة')}
                    </Button>
                )}
            </div>

            {governorate.cities.length === 0 ? (
                <div className="px-5 pb-5">
                    <EmptyState icon="map-pin" title={t('لا توجد مدن بعد')} description={t('أضف مدن هذه المحافظة ليختار منها العملاء والتجار.')} />
                </div>
            ) : (
                <ul className="mx-5 mb-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {governorate.cities.map((city) => (
                        <li key={city.id} className={cn('flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2', !city.is_active && 'bg-surface-2/60')}>
                            <span className={cn('size-2 shrink-0 rounded-full', city.is_active ? 'bg-success' : 'bg-line-strong')} />
                            <div className="min-w-0 flex-1">
                                <p className={cn('truncate text-sm font-medium', city.is_active ? 'text-ink' : 'text-muted line-through')}>{city.name}</p>
                                <p dir="ltr" className="truncate text-start text-xs text-muted">
                                    {city.name_en || '—'}
                                </p>
                            </div>
                            {canUpdate && (
                                <div className="flex items-center gap-1">
                                    <Switch checked={city.is_active} onChange={() => onToggle('city', city)} disabled={busy} ariaLabel={t('تفعيل {name}', { name: city.name })} />
                                    <button type="button" onClick={() => onEdit('city', city)} className="ms-2 grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink" aria-label={t('تعديل {name}', { name: city.name })}>
                                        <Icon name="edit" className="size-4" />
                                    </button>
                                    <button type="button" onClick={() => onDelete('city', city)} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger" aria-label={t('حذف {name}', { name: city.name })}>
                                        <Icon name="trash" className="size-4" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Add or edit a governorate or a city: the Arabic and English names and whether it's active. */
function LocationFormModal({ editing, busy, onClose, onSave }) {
    const [values, setValues] = useState(EMPTY_ENTRY);

    useEffect(() => {
        if (editing) {
            setValues(editing.entry ? { name: editing.entry.name, name_en: editing.entry.name_en ?? '', is_active: editing.entry.is_active } : EMPTY_ENTRY);
        }
    }, [editing]);

    const isCity = editing?.kind === 'city';
    const isNew = !editing?.entry;
    const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

    return (
        <Modal
            open={Boolean(editing)}
            onClose={onClose}
            icon="map-pin"
            title={isNew ? (isCity ? t('إضافة مدينة') : t('إضافة محافظة')) : isCity ? t('تعديل المدينة') : t('تعديل المحافظة')}
            description={isNew ? t('الرمز يُنشأ من الاسم الإنجليزي ولا يتغير بعد ذلك.') : undefined}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        {t('إلغاء')}
                    </Button>
                    <Button icon="check" loading={busy} onClick={() => onSave(values)} disabled={!values.name.trim() || !values.name_en.trim()}>
                        {t('حفظ')}
                    </Button>
                </>
            }
        >
            <form
                className="flex flex-col gap-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSave(values);
                }}
            >
                <Field label={t('الاسم بالعربية')} required>
                    {(props) => <Input {...props} value={values.name} onChange={set('name')} maxLength={80} placeholder={isCity ? t('مثال: مدينة نصر') : t('مثال: القاهرة')} autoFocus />}
                </Field>
                <Field label={t('الاسم بالإنجليزية')} required>
                    {(props) => <Input {...props} value={values.name_en} onChange={set('name_en')} maxLength={80} dir="ltr" className="text-start" placeholder={isCity ? 'Nasr City' : 'Cairo'} />}
                </Field>
                <Switch checked={values.is_active} onChange={(isActive) => setValues((current) => ({ ...current, is_active: isActive }))} label={t('مفعّلة')} description={t('تظهر للعملاء والتجار عند اختيار العنوان والشحن.')} />
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
