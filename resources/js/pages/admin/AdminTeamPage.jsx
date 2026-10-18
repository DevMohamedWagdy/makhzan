import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Select, Switch } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Navigation';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { RoleFormModal } from '@/features/staff/RoleFormModal';
import { t } from '@/i18n';
import { formatNumber, formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const SECTIONS = {
    overview: { label: t('نظرة عامة'), icon: 'grid' },
    stores: { label: t('المتاجر'), icon: 'store' },
    vendors: { label: t('التجار والحسابات'), icon: 'users' },
    orders: { label: t('الطلبات'), icon: 'shopping-bag' },
    tickets: { label: t('تذاكر الدعم'), icon: 'message-square' },
    subscriptions: { label: t('الاشتراكات'), icon: 'wallet' },
    plans: { label: t('الباقات'), icon: 'zap' },
    logs: { label: t('سجل النشاط'), icon: 'clock' },
    team: { label: t('فريق الإدارة'), icon: 'shield-check' },
};

const ACTIONS = {
    view: t('عرض'),
    update: t('تعديل'),
    suspend: t('إيقاف وتفعيل'),
    impersonate: t('الدخول بحساب التاجر'),
    manage: t('إدارة'),
    reply: t('الرد والإغلاق'),
};

const TEMPLATES = [
    { name: t('دعم فني'), description: t('يتابع المتاجر والحسابات والطلبات ويدخل بحساب التاجر للمساعدة'), permissions: ['overview.view', 'stores.view', 'stores.impersonate', 'vendors.view', 'vendors.update', 'orders.view', 'tickets.view', 'tickets.reply', 'logs.view'] },
    { name: t('المالية'), description: t('يراجع طلبات الاشتراك ويفعّلها ويرى المدفوعات والباقات'), permissions: ['overview.view', 'stores.view', 'subscriptions.view', 'subscriptions.manage', 'plans.view'] },
    { name: t('مبيعات'), description: t('يتابع المتاجر الجديدة والتجارب وينشئ الاشتراكات'), permissions: ['overview.view', 'stores.view', 'subscriptions.view', 'subscriptions.manage', 'plans.view'] },
];

const TABS = [
    { value: 'members', label: t('الأعضاء'), icon: 'users' },
    { value: 'roles', label: t('الأدوار والصلاحيات'), icon: 'shield-check' },
];

/** The platform team: who can sign in to the admin panel, and what each role allows. */
export function AdminTeamPage() {
    const toast = useToast();
    const { admin: me } = useAdminAuth();
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
        Promise.all([adminApi.team(), adminApi.roles()])
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
            await (deleting.kind === 'role' ? adminApi.removeRole(deleting.item.role_id) : adminApi.removeTeamMember(deleting.item.admin_id));
            toast.success(t('تم الحذف'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر الحذف'), Object.values(removeError.errors ?? {})[0] ?? removeError.message);
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
                title={t('فريق الإدارة')}
                description={t('أعضاء فريق المنصة وأدوارهم؛ المدير العام يملك كل الصلاحيات')}
                actions={
                    <Button icon="plus" onClick={() => (tab === 'roles' ? setEditingRole({}) : setEditingMember({}))}>
                        {tab === 'roles' ? t('دور جديد') : t('عضو جديد')}
                    </Button>
                }
            />

            <section className="mk-card overflow-hidden">
                <Tabs tabs={TABS} value={tab} onChange={(value) => setSearchParams(value === 'members' ? {} : { tab: value }, { replace: true })} className="px-3" />
                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الفريق')} description={error} />
                    </div>
                ) : !members || !roles ? (
                    <div className="flex flex-col gap-2 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                        ))}
                    </div>
                ) : tab === 'roles' ? (
                    roles.length === 0 ? (
                        <div className="p-6">
                            <EmptyState icon="shield-check" title={t('لا توجد أدوار بعد')} description={t('أنشئ أدواراً مثل الدعم الفني أو المالية بصلاحيات محددة.')} action={<Button icon="plus" onClick={() => setEditingRole({})}>{t('دور جديد')}</Button>} />
                        </div>
                    ) : (
                        <ul className="divide-y divide-line">
                            {roles.map((role) => (
                                <li key={role.role_id} className="flex flex-wrap items-start gap-4 px-4 py-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 font-semibold text-ink">
                                            {role.name}
                                            <Badge tone="neutral">{t('{count} عضو', { count: formatNumber(role.admins_count) })}</Badge>
                                        </p>
                                        {role.description && <p className="text-xs text-muted">{role.description}</p>}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {role.permissions.map((permission) => {
                                                const [section, action] = permission.split('.');

                                                return (
                                                    <Badge key={permission} tone="info">
                                                        {SECTIONS[section]?.label}: {ACTIONS[action] ?? action}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingRole(role)} aria-label={t('تعديل {name}', { name: role.name })} />
                                        <Button size="icon" variant="ghost" icon="trash" disabled={role.admins_count > 0} onClick={() => setDeleting({ kind: 'role', item: role })} aria-label={t('حذف {name}', { name: role.name })} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )
                ) : (
                    <ul className="divide-y divide-line">
                        {members.map((member) => (
                            <li key={member.admin_id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                                <Avatar name={member.full_name} size="md" />
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                                        {member.full_name}
                                        {member.admin_id === me?.admin_id && <Badge tone="neutral">{t('أنت')}</Badge>}
                                        {!member.is_active && <Badge tone="danger">{t('موقوف')}</Badge>}
                                    </p>
                                    <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                                        <span className="ltr">{member.email}</span>
                                        <span>{member.last_login_at ? t('آخر دخول {time}', { time: formatRelative(member.last_login_at) }) : t('لم يسجّل دخول بعد')}</span>
                                    </p>
                                </div>
                                <Badge tone={member.is_super ? 'primary' : 'info'} icon="shield-check">
                                    {member.is_super ? t('مدير عام') : (member.role?.name ?? t('بدون دور'))}
                                </Badge>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingMember(member)} aria-label={t('تعديل {name}', { name: member.full_name })} />
                                    <Button size="icon" variant="ghost" icon="trash" disabled={member.admin_id === me?.admin_id} onClick={() => setDeleting({ kind: 'member', item: member })} aria-label={t('حذف {name}', { name: member.full_name })} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {editingMember && <TeamMemberModal member={editingMember.admin_id ? editingMember : null} roles={roles ?? []} onClose={() => setEditingMember(null)} onSaved={saved} />}
            <RoleFormModal open={Boolean(editingRole)} role={editingRole?.role_id ? editingRole : null} catalog={catalog} sections={SECTIONS} actionLabels={ACTIONS} templates={TEMPLATES} save={adminApi.saveRole} onClose={() => setEditingRole(null)} onSaved={saved} />
            <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} icon="trash" title={t('تأكيد الحذف؟')} description={deleting ? t('سيتم حذف {name}.', { name: deleting.item.name ?? deleting.item.full_name }) : ''} confirmLabel={t('حذف')} />
        </>
    );
}

function TeamMemberModal({ member, roles, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState({ full_name: member?.full_name ?? '', email: member?.email ?? '', password: '', is_super: member?.is_super ?? false, is_active: member?.is_active ?? true, role_id: member?.role?.role_id ?? roles[0]?.role_id ?? '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const set = (key, value) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            await adminApi.saveTeamMember({ ...values, password: values.password || null, role_id: values.is_super ? null : Number(values.role_id) || null }, member?.admin_id);
            toast.success(member ? t('تم حفظ العضو') : t('تمت إضافة العضو'));
            onSaved();
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر الحفظ'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} icon="user-plus" title={member ? t('تعديل العضو') : t('عضو جديد')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label={t('الاسم')} required error={errors.full_name}>
                    {(props) => <Input {...props} value={values.full_name} onChange={(event) => set('full_name', event.target.value)} data-autofocus />}
                </Field>
                <Field label={t('البريد الإلكتروني')} required error={errors.email}>
                    {(props) => <Input {...props} type="email" value={values.email} onChange={(event) => set('email', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={member ? t('كلمة مرور جديدة') : t('كلمة المرور')} required={!member} optional={Boolean(member)} hint={t('١٠ أحرف على الأقل')} error={errors.password}>
                    {(props) => <PasswordInput {...props} value={values.password} onChange={(event) => set('password', event.target.value)} autoComplete="new-password" />}
                </Field>
                <Switch checked={values.is_super} onChange={(checked) => set('is_super', checked)} label={t('مدير عام')} description={t('كل الصلاحيات، بما فيها إدارة الفريق.')} />
                {!values.is_super && (
                    <Field label={t('الدور')} required error={errors.role_id} hint={roles.length === 0 ? t('أضف دوراً أولاً من تبويب الأدوار.') : undefined}>
                        {(props) => <Select {...props} value={values.role_id} onChange={(event) => set('role_id', event.target.value)} options={roles.map((role) => ({ value: role.role_id, label: role.name }))} placeholder={t('اختر الدور')} />}
                    </Field>
                )}
                {member && <Switch checked={values.is_active} onChange={(checked) => set('is_active', checked)} label={t('الحساب مفعّل')} description={errors.is_active ?? t('إيقاف الحساب يسجّل خروجه فوراً.')} />}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
