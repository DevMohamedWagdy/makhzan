import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { Icon } from '@/components/ui/Icon';
import { PERMISSION_GROUPS, PERMISSION_SECTIONS } from '@/features/staff/permissions';
import { RoleFormModal } from '@/features/staff/RoleFormModal';
import { StaffFormModal } from '@/features/staff/StaffFormModal';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { staffApi } from '@/services/staffApi';

const TABS = [
    { value: 'members', label: t('الموظفين'), icon: 'users' },
    { value: 'roles', label: t('الأدوار والصلاحيات'), icon: 'shield-check' },
];

/** How many tags a role card shows before folding the rest into "+N". */
const VISIBLE_SECTIONS = 10;

/**
 * The pages a role opens, in sidebar order: each with whether it can only view or also act.
 * @returns {Array<{ section: string, label: string, icon: string, viewOnly: boolean }>}
 */
function roleSections(permissions) {
    const granted = new Set(permissions);
    const order = PERMISSION_GROUPS.flatMap((group) => Object.keys(PERMISSION_SECTIONS).filter((section) => PERMISSION_SECTIONS[section].group === group.key));

    return order
        .filter((section) => granted.has(`${section}.view`) || permissions.some((permission) => permission.startsWith(`${section}.`)))
        .map((section) => ({
            section,
            label: PERMISSION_SECTIONS[section].label,
            icon: PERMISSION_SECTIONS[section].icon,
            viewOnly: !permissions.some((permission) => permission.startsWith(`${section}.`) && !permission.endsWith('.view')),
        }));
}

/** One role: name, staff count, how much of the dashboard it opens, and the pages as tags. */
function RoleCard({ role, total, onEdit, onDelete }) {
    const sections = roleSections(role.permissions);
    const hidden = sections.length - VISIBLE_SECTIONS;

    return (
        <article className="flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <header className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="shield-check" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-ink">{role.name}</h3>
                    <p className="line-clamp-2 text-xs text-muted">{role.description || t('بدون وصف')}</p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                    <Button size="icon" variant="ghost" icon="edit" onClick={onEdit} aria-label={t('تعديل {name}', { name: role.name })} title={t('تعديل')} />
                    <Button size="icon" variant="ghost" icon="trash" onClick={onDelete} disabled={role.staff_count > 0} title={role.staff_count > 0 ? t('انقل موظفي هذا الدور لدور آخر أولاً') : t('حذف')} aria-label={t('حذف {name}', { name: role.name })} />
                </div>
            </header>

            <div className="mt-4 flex items-center gap-3 text-xs">
                <Badge tone="neutral" icon="users">
                    {t('{count} موظف', { count: formatNumber(role.staff_count) })}
                </Badge>
                <span className="text-muted">{t('يفتح {count} من {total} صفحة', { count: formatNumber(sections.length), total: formatNumber(total) })}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (sections.length / total) * 100 : 0}%` }} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {sections.length === 0 ? (
                    <p className="text-xs text-muted">{t('بدون صلاحيات')}</p>
                ) : (
                    <>
                        {sections.slice(0, VISIBLE_SECTIONS).map((item) => (
                            <span
                                key={item.section}
                                className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium', item.viewOnly ? 'bg-surface-3 text-ink-2' : 'bg-primary-soft text-primary')}
                                title={item.viewOnly ? t('عرض فقط') : t('عرض وتعديل')}
                            >
                                <Icon name={item.viewOnly ? 'eye' : item.icon} className="size-3" />
                                {item.label}
                            </span>
                        ))}
                        {hidden > 0 && (
                            <button type="button" onClick={onEdit} className="rounded-md bg-surface-3 px-2 py-1 text-2xs font-medium text-ink-2 hover:text-primary">
                                {t('+{count} أخرى', { count: formatNumber(hidden) })}
                            </button>
                        )}
                    </>
                )}
            </div>
        </article>
    );
}

/** The owner's team: staff accounts, and the roles that decide what each can see and do. */
export function StaffPage() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'roles' ? 'roles' : 'members';
    const [members, setMembers] = useState(null);
    const [roles, setRoles] = useState(null);
    const [catalog, setCatalog] = useState({});
    const [error, setError] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        Promise.all([staffApi.list(), staffApi.roles()])
            .then(([loadedMembers, loadedRoles]) => {
                setMembers(loadedMembers);
                setRoles(loadedRoles.data);
                setCatalog(loadedRoles.catalog);
            })
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(load, [load]);

    const remove = async () => {
        setBusy(true);

        try {
            if (deleting.kind === 'role') {
                await staffApi.removeRole(deleting.item.role_id);
            } else {
                await staffApi.remove(deleting.item.staff_id);
            }

            toast.success(deleting.kind === 'role' ? t('تم حذف الدور') : t('تم حذف الموظف'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر الحذف'), removeError.errors?.role ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    const saved = () => {
        setEditingMember(null);
        setEditingRole(null);
        load();
    };

    return (
        <>
            <PageHeader
                title={t('فريق العمل')}
                description={t('أضف موظفين بحساباتهم، وحدد لكل دور ما يراه وما يستطيع تعديله أو حذفه')}
                breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('فريق العمل')]}
                actions={
                    tab === 'roles' ? (
                        <Button icon="plus" onClick={() => setEditingRole({})}>
                            {t('دور جديد')}
                        </Button>
                    ) : (
                        <Button icon="plus" onClick={() => setEditingMember({})} disabled={roles?.length === 0} title={roles?.length === 0 ? t('أضف دوراً أولاً') : undefined}>
                            {t('موظف جديد')}
                        </Button>
                    )
                }
            />

            <section className="mk-card overflow-hidden">
                <Tabs tabs={TABS} value={tab} onChange={(value) => setSearchParams(value === 'members' ? {} : { tab: value }, { replace: true })} className="px-3" />

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل فريق العمل')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !members || !roles ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : tab === 'roles' ? (
                    roles.length === 0 ? (
                        <div className="p-6">
                            <EmptyState icon="shield-check" title={t('لا توجد أدوار بعد')} description={t('ابدأ بدور جاهز مثل خدمة العملاء أو موظف مخزن، ثم عدّل صلاحياته.')} action={<Button icon="plus" onClick={() => setEditingRole({})}>{t('دور جديد')}</Button>} />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 p-4">
                            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-sm bg-primary-soft ring-1 ring-primary/40" />
                                    {t('عرض وتعديل')}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-sm bg-surface-3 ring-1 ring-line-strong" />
                                    {t('عرض فقط')}
                                </span>
                            </p>
                            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {roles.map((role) => (
                                    <RoleCard key={role.role_id} role={role} total={Object.keys(catalog).length} onEdit={() => setEditingRole(role)} onDelete={() => setDeleting({ kind: 'role', item: role })} />
                                ))}
                            </div>
                        </div>
                    )
                ) : members.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="users"
                            title={t('لا يوجد موظفين بعد')}
                            description={roles.length === 0 ? t('أنشئ دوراً أولاً من تبويب الأدوار، ثم أضف موظفيك عليه.') : t('أضف موظف خدمة العملاء أو المخزن ليتابع الطلبات بنفسه، دون أن يرى أرباحك أو إعداداتك.')}
                            action={roles.length === 0 ? <Button icon="shield-check" onClick={() => setSearchParams({ tab: 'roles' })}>{t('إنشاء دور')}</Button> : <Button icon="plus" onClick={() => setEditingMember({})}>{t('موظف جديد')}</Button>}
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    <th className="px-4 py-3 text-start font-medium">{t('الموظف')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('التواصل')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('الدور')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('الحالة')}</th>
                                    <th className="w-24 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {members.map((member) => (
                                    <tr key={member.staff_id} className={cn('transition hover:bg-surface-2', !member.is_active && 'opacity-70')}>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={member.full_name} size="md" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-ink">{member.full_name}</p>
                                                    <p className="truncate text-xs text-muted">{member.job_title || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1 text-xs text-ink-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Icon name="phone" className="size-3.5 text-muted" />
                                                    <span className="ltr">{member.phone}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Icon name="mail" className="size-3.5 text-muted" />
                                                    <span className="ltr">{member.email}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {member.role ? (
                                                <Badge tone="info" icon="shield-check">
                                                    {member.role.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted">{t('بدون دور')}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge tone={member.is_active ? 'success' : 'neutral'} dot>
                                                {member.is_active ? t('مفعّل') : t('موقوف')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingMember(member)} aria-label={t('تعديل {name}', { name: member.full_name })} title={t('تعديل')} />
                                                <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting({ kind: 'member', item: member })} aria-label={t('حذف {name}', { name: member.full_name })} title={t('حذف')} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <StaffFormModal open={Boolean(editingMember)} member={editingMember?.staff_id ? editingMember : null} roles={roles ?? []} onClose={() => setEditingMember(null)} onSaved={saved} />
            <RoleFormModal open={Boolean(editingRole)} role={editingRole?.role_id ? editingRole : null} catalog={catalog} save={staffApi.saveRole} onClose={() => setEditingRole(null)} onSaved={saved} />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={deleting?.kind === 'role' ? t('حذف الدور؟') : t('حذف الموظف؟')}
                description={deleting ? (deleting.kind === 'role' ? t('سيتم حذف دور {name}.', { name: deleting.item.name }) : t('سيتم حذف حساب {name} وتسجيل خروجه فوراً.', { name: deleting.item.full_name })) : ''}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
