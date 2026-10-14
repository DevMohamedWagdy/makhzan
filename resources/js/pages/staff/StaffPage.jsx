import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { PERMISSION_ACTIONS, PERMISSION_SECTIONS } from '@/features/staff/permissions';
import { RoleFormModal } from '@/features/staff/RoleFormModal';
import { StaffFormModal } from '@/features/staff/StaffFormModal';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { staffApi } from '@/services/staffApi';

const TABS = [
    { value: 'members', label: t('الموظفين'), icon: 'users' },
    { value: 'roles', label: t('الأدوار والصلاحيات'), icon: 'shield-check' },
];

/** Groups a role's "section.action" keys into "Orders: view, update" lines. */
function permissionSummary(permissions) {
    const sections = {};

    permissions.forEach((permission) => {
        const [section, action] = permission.split('.');

        (sections[section] ??= []).push(PERMISSION_ACTIONS[action] ?? action);
    });

    return Object.entries(sections).map(([section, actions]) => `${PERMISSION_SECTIONS[section]?.label ?? section}: ${actions.join('، ')}`);
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
                        <ul className="divide-y divide-line">
                            {roles.map((role) => (
                                <li key={role.role_id} className="flex flex-wrap items-start gap-4 px-4 py-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 font-semibold text-ink">
                                            {role.name}
                                            <Badge tone="neutral">{t('{count} موظف', { count: formatNumber(role.staff_count) })}</Badge>
                                        </p>
                                        {role.description && <p className="text-xs text-muted">{role.description}</p>}
                                        <ul className="mt-2 flex flex-col gap-0.5 text-xs text-ink-2">
                                            {role.permissions.length === 0 ? <li className="text-muted">{t('بدون صلاحيات')}</li> : permissionSummary(role.permissions).map((line) => <li key={line}>{line}</li>)}
                                        </ul>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingRole(role)} aria-label={t('تعديل {name}', { name: role.name })} />
                                        <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting({ kind: 'role', item: role })} disabled={role.staff_count > 0} title={role.staff_count > 0 ? t('انقل موظفي هذا الدور لدور آخر أولاً') : undefined} aria-label={t('حذف {name}', { name: role.name })} />
                                    </div>
                                </li>
                            ))}
                        </ul>
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
                    <ul className="divide-y divide-line">
                        {members.map((member) => (
                            <li key={member.staff_id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                                <Avatar name={member.full_name} size="md" />
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 font-semibold text-ink">
                                        {member.full_name}
                                        {!member.is_active && <Badge tone="neutral">{t('موقوف')}</Badge>}
                                    </p>
                                    <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                                        <span className="ltr">{member.phone}</span>
                                        <span className="ltr">{member.email}</span>
                                    </p>
                                </div>
                                <Badge tone="info" icon="shield-check">
                                    {member.role?.name ?? t('بدون دور')}
                                </Badge>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingMember(member)} aria-label={t('تعديل {name}', { name: member.full_name })} />
                                    <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting({ kind: 'member', item: member })} aria-label={t('حذف {name}', { name: member.full_name })} />
                                </div>
                            </li>
                        ))}
                    </ul>
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
