import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Drawer } from '@/components/ui/Overlay';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AddAffiliateDrawer } from '@/features/affiliates/AddAffiliateDrawer';
import { DeleteDialog, FreezeDialog, ImpersonateDialog } from '@/features/affiliates/AffiliateActionDialogs';
import { AffiliateFilters, AffiliateStatusTabs, PAYOUT_REQUEST_TAB } from '@/features/affiliates/AffiliateFilters';
import { AffiliateForm } from '@/features/affiliates/AffiliateForm';
import { AffiliateProfileDrawer } from '@/features/affiliates/AffiliateProfileDrawer';
import { AffiliatesTable } from '@/features/affiliates/AffiliatesTable';
import { CommissionModal } from '@/features/affiliates/CommissionModal';
import { RecordPayoutModal, RejectPayoutDialog } from '@/features/affiliates/PayoutModals';
import { useAffiliateActions } from '@/features/affiliates/useAffiliateActions';
import { useAffiliates } from '@/features/affiliates/useAffiliates';
import { formatMoney, formatNumber } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';

/** @typedef {'add' | 'edit' | 'commission' | 'payout' | 'reject-payout' | 'freeze' | 'delete' | 'reject' | 'impersonate'} DialogType */

export function AffiliatesPage() {
    const { store, impersonate } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const list = useAffiliates();
    const { replaceAffiliate, reload } = list;
    const [profile, setProfile] = useState(null);
    /** @type {[{ type: DialogType, affiliate?: object, method?: string } | null, Function]} */
    const [dialog, setDialog] = useState(null);
    const [impersonating, setImpersonating] = useState(false);

    const closeDialog = useCallback(() => setDialog(null), []);

    // Notifications and the payout requests page link here with ?affiliate={id} to open a profile.
    const [searchParams, setSearchParams] = useSearchParams();
    const linkedAffiliateId = searchParams.get('affiliate');

    useEffect(() => {
        if (linkedAffiliateId) {
            affiliatesApi
                .get(linkedAffiliateId)
                .then(setProfile)
                .catch((error) => toast.error('تعذر فتح ملف المسوق', error.message));
        }
    }, [linkedAffiliateId, toast]);

    const closeProfile = () => {
        setProfile(null);

        if (linkedAffiliateId) {
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    next.delete('affiliate');

                    return next;
                },
                { replace: true },
            );
        }
    };

    const onChanged = useCallback(
        (updated) => {
            replaceAffiliate(updated);
            setProfile((current) => (current?.affiliate_id === updated.affiliate_id ? updated : current));
            setDialog(null);
            reload();
        },
        [replaceAffiliate, reload],
    );

    const onRemoved = useCallback(
        (removed) => {
            setProfile((current) => (current?.affiliate_id === removed.affiliate_id ? null : current));
            setDialog(null);
            reload();
        },
        [reload],
    );

    const affiliateActions = useAffiliateActions({ onChanged, onRemoved });

    /** Single action map shared by table rows and the profile drawer. */
    const actions = useMemo(
        () => ({
            view: (affiliate) => setProfile(affiliate),
            edit: (affiliate) => setDialog({ type: 'edit', affiliate }),
            commission: (affiliate) => setDialog({ type: 'commission', affiliate }),
            payout: (affiliate) => setDialog({ type: 'payout', affiliate }),
            rejectPayout: (affiliate) => setDialog({ type: 'reject-payout', affiliate }),
            freeze: (affiliate) => setDialog({ type: 'freeze', affiliate }),
            remove: (affiliate) => setDialog({ type: 'delete', affiliate }),
            reject: (affiliate) => setDialog({ type: 'reject', affiliate }),
            impersonate: (affiliate) => setDialog({ type: 'impersonate', affiliate }),
            activate: (affiliate) => affiliateActions.activate(affiliate).catch(() => {}),
            approve: (affiliate) => affiliateActions.activate(affiliate, { approving: true }).catch(() => {}),
            createReferralCode: (affiliate) => affiliateActions.createReferralCode(affiliate).catch(() => {}),
        }),
        [affiliateActions],
    );

    const startImpersonation = async () => {
        setImpersonating(true);

        try {
            await impersonate(dialog.affiliate.affiliate_id);
            navigate('/affiliate');
        } catch (error) {
            toast.error('تعذر الدخول بصفة المسوق', error.message);
        } finally {
            setImpersonating(false);
        }
    };

    const summary = list.summary;
    const target = dialog?.affiliate ?? null;
    const swallow = () => {};

    return (
        <>
            <PageHeader
                title="المسوقين"
                description={`إدارة فريق المسوقين بالعمولة لمتجر ${store?.name ?? ''}`}
                breadcrumbs={['لوحة التحكم', 'التسويق', 'المسوقين']}
                actions={
                    <>
                        <Button variant="secondary" icon="link" onClick={() => setDialog({ type: 'add', method: 'link' })}>
                            رابط التسجيل
                        </Button>
                        <Button icon="user-plus" onClick={() => setDialog({ type: 'add', method: 'manual' })}>
                            إضافة مسوق
                        </Button>
                    </>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="إجمالي المسوقين" value={summary ? formatNumber(summary.total) : '—'} icon="users" tone="primary" hint={summary && `${formatNumber(summary.pending)} بانتظار المراجعة`} />
                <StatCard label="المسوقون النشطون" value={summary ? formatNumber(summary.active) : '—'} icon="check-circle" tone="success" hint={summary && `${formatNumber(summary.frozen)} حساب مجمد`} />
                <StatCard label="مبيعات المسوقين" value={summary ? formatMoney(summary.sales_total) : '—'} icon="bar-chart" tone="info" hint="منذ بداية التعامل" />
                <StatCard label="العمولات المكتسبة" value={summary ? formatMoney(summary.earned_commission) : '—'} icon="wallet" tone="warning" hint={summary?.payout_requests ? `${formatNumber(summary.payout_requests)} طلب تحويل بانتظارك` : 'إجمالي المستحق للمسوقين'} />
            </div>

            <section className="mk-card overflow-hidden">
                <div className="pt-1">
                    <AffiliateStatusTabs
                        value={list.filters.payout_request ? PAYOUT_REQUEST_TAB : list.filters.status}
                        onChange={(tab) => list.setFilters(tab === PAYOUT_REQUEST_TAB ? { status: '', payout_request: '1' } : { status: tab, payout_request: '' })}
                        summary={summary}
                    />
                </div>
                <AffiliateFilters filters={list.filters} onChange={list.setFilters} onReset={list.resetFilters} hasActiveFilters={list.hasActiveFilters} />
                <AffiliatesTable
                    items={list.items}
                    loading={list.loading}
                    error={list.error}
                    perPage={list.filters.per_page}
                    actions={actions}
                    hasActiveFilters={list.hasActiveFilters}
                    onResetFilters={list.resetFilters}
                    onAdd={() => setDialog({ type: 'add', method: 'manual' })}
                    onRetry={list.reload}
                />
                {list.items.length > 0 && (
                    <div className="border-t border-line px-5 py-4">
                        <Pagination meta={list.meta} onPageChange={(page) => list.setFilters({ page })} />
                    </div>
                )}
            </section>

            <AffiliateProfileDrawer key={profile?.affiliate_id} affiliate={profile} open={Boolean(profile)} onClose={closeProfile} actions={actions} creatingCode={affiliateActions.pending === 'referral'} />

            <AddAffiliateDrawer
                open={dialog?.type === 'add'}
                initialMethod={dialog?.method}
                onClose={closeDialog}
                pendingCount={summary?.pending ?? 0}
                onCreated={(affiliate) => {
                    closeDialog();
                    list.reload();
                    setProfile(affiliate);
                }}
                onImported={list.reload}
                onReviewPending={() => {
                    closeDialog();
                    list.setFilters({ status: 'pending' });
                }}
            />

            <Drawer open={dialog?.type === 'edit'} onClose={closeDialog} size="lg" icon="edit" title="تعديل بيانات المسوق" description={target?.full_name}>
                {dialog?.type === 'edit' && <AffiliateForm key={target.affiliate_id} affiliate={target} onSaved={onChanged} onCancel={closeDialog} />}
            </Drawer>

            <CommissionModal
                affiliate={target}
                open={dialog?.type === 'commission'}
                onClose={closeDialog}
                saving={affiliateActions.pending === 'commission'}
                onSave={(payload) => affiliateActions.setCommission(target, payload).catch(swallow)}
            />

            <RecordPayoutModal
                affiliate={target}
                open={dialog?.type === 'payout'}
                onClose={closeDialog}
                saving={affiliateActions.pending === 'payout'}
                onSave={(payload) => affiliateActions.recordPayout(target, payload).catch(swallow)}
            />

            <RejectPayoutDialog
                affiliate={target}
                open={dialog?.type === 'reject-payout'}
                onClose={closeDialog}
                loading={affiliateActions.pending === 'reject-payout'}
                onConfirm={(note) => affiliateActions.rejectPayout(target, note).catch(swallow)}
            />

            <FreezeDialog affiliate={target} open={dialog?.type === 'freeze'} onClose={closeDialog} loading={affiliateActions.pending === 'freeze'} onConfirm={(reason) => affiliateActions.freeze(target, reason).catch(swallow)} />

            <DeleteDialog
                affiliate={target}
                open={dialog?.type === 'delete' || dialog?.type === 'reject'}
                rejecting={dialog?.type === 'reject'}
                onClose={closeDialog}
                loading={affiliateActions.pending === 'delete'}
                onConfirm={() => affiliateActions.remove(target, { rejecting: dialog?.type === 'reject' }).catch(swallow)}
            />

            <ImpersonateDialog affiliate={target} open={dialog?.type === 'impersonate'} onClose={closeDialog} loading={impersonating} onConfirm={startImpersonation} />
        </>
    );
}
