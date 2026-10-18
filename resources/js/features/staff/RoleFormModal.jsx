import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { PERMISSION_ACTIONS, PERMISSION_GROUPS, PERMISSION_SECTIONS, ROLE_TEMPLATES } from './permissions';

const EMPTY = { name: '', description: '', permissions: [] };

/**
 * Add or edit a role: a grid of sections × actions. Any action also grants "view" of its
 * section (the API applies the same rule). Store roles by default, grouped like the sidebar;
 * the admin panel passes its own labels, templates and save call, and its sections (which
 * have no group) are listed without headings.
 */
export function RoleFormModal({ open, role, catalog, onClose, onSaved, save, sections = PERMISSION_SECTIONS, actionLabels = PERMISSION_ACTIONS, templates = ROLE_TEMPLATES, groups = PERMISSION_GROUPS }) {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues(role ? { name: role.name, description: role.description ?? '', permissions: role.permissions } : EMPTY);
            setErrors({});
        }
    }, [open, role]);

    const has = (permission) => values.permissions.includes(permission);
    const actions = (section) => catalog[section] ?? [];

    const toggle = (section, action) => {
        const key = `${section}.${action}`;

        setValues((current) => {
            let permissions = current.permissions.includes(key) ? current.permissions.filter((item) => item !== key) : [...current.permissions, key];

            if (action === 'view' && !permissions.includes(key) && actions(section).includes('view')) {
                permissions = permissions.filter((item) => !item.startsWith(`${section}.`));
            } else if (action !== 'view' && actions(section).includes('view') && !permissions.includes(`${section}.view`) && permissions.includes(key)) {
                permissions = [...permissions, `${section}.view`];
            }

            return { ...current, permissions };
        });
    };

    const toggleSection = (section) => {
        const keys = catalog[section].map((action) => `${section}.${action}`);
        const all = keys.every(has);

        setValues((current) => ({ ...current, permissions: all ? current.permissions.filter((item) => !keys.includes(item)) : [...new Set([...current.permissions, ...keys])] }));
    };

    // Store sections carry a sidebar group; the admin panel's don't, and are listed as one block.
    const groupedSections = groups
        .map((group) => ({ ...group, entries: Object.entries(catalog).filter(([section]) => sections[section]?.group === group.key) }))
        .filter((group) => group.entries.length > 0);
    const ungrouped = Object.entries(catalog).filter(([section]) => !groupedSections.some((group) => group.entries.some(([key]) => key === section)));

    if (ungrouped.length > 0) {
        groupedSections.push({ key: 'other', label: groupedSections.length ? t('أخرى') : null, entries: ungrouped });
    }

    const renderSection = (section, actions) => {
        const config = sections[section] ?? { label: section, icon: 'grid' };
        const all = actions.every((action) => has(`${section}.${action}`));

        return (
            <div key={section} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <button type="button" onClick={() => toggleSection(section)} className="flex w-44 shrink-0 items-center gap-2 text-start text-sm font-semibold text-ink" title={all ? t('إلغاء الكل') : t('تحديد الكل')}>
                    <Icon name={config.icon} className="size-4 text-primary" />
                    <span>
                        {config.label}
                        {config.hint && <span className="block text-[11px] font-normal text-muted">{config.hint}</span>}
                    </span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => {
                        const active = has(`${section}.${action}`);

                        return (
                            <button
                                key={action}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggle(section, action)}
                                className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium transition', active ? 'border-primary bg-primary-soft text-primary' : 'border-line text-muted hover:border-line-strong hover:text-ink')}
                            >
                                {active && <Icon name="check" className="me-1 inline size-3" />}
                                {actionLabels[action] ?? action}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const saved = await save({ ...values, description: values.description || null }, role?.role_id);

            toast.success(role ? t('تم حفظ الدور') : t('تمت إضافة الدور'));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الدور'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="lg" icon="shield-check" title={role ? t('تعديل الدور') : t('دور جديد')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                {!role && templates.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-medium text-muted">{t('ابدأ من قالب جاهز')}</p>
                        <div className="flex flex-wrap gap-2">
                            {templates.map((template) => (
                                <button key={template.name} type="button" onClick={() => setValues({ ...template })} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 transition hover:border-primary hover:text-primary">
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('اسم الدور')} required error={errors.name}>
                        {(props) => <Input {...props} value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} data-autofocus maxLength={60} placeholder={t('مثال: خدمة العملاء')} />}
                    </Field>
                    <Field label={t('وصف')} optional error={errors.description}>
                        {(props) => <Input {...props} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} maxLength={255} />}
                    </Field>
                </div>

                <div className="mk-scroll max-h-[55vh] overflow-y-auto rounded-xl border border-line">
                    {groupedSections.map(({ key, label, entries }) => (
                        <div key={key}>
                            {label && <p className="sticky top-0 z-10 border-b border-line bg-surface-2 px-4 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>}
                            {entries.map(([section, actions]) => renderSection(section, actions))}
                        </div>
                    ))}
                </div>
                {errors.permissions && <p className="text-xs text-danger">{errors.permissions}</p>}

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ الدور')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
