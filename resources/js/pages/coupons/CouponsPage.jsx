import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, StatCard } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { CouponFormDrawer } from '@/features/coupons/CouponFormDrawer';
import { describeConditions, describeDiscount } from '@/features/coupons/couponText';
import { useCopy, useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { COUPON_STATES } from '@/lib/constants';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { couponsApi } from '@/services/couponsApi';

const COLUMNS = [t('الكود'), t('الخصم'), t('الشروط'), t('الاستخدام'), t('الخصومات الممنوحة'), t('الحالة'), ''];

/** Discount codes with state tabs, stats and the coupon form (?coupon={id} or ?coupon=new). */
export function CouponsPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const { copy, copiedValue } = useCopy();
    const [searchParams, setSearchParams] = useSearchParams();
    const state = searchParams.get('state') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const searchQuery = searchParams.get('search') ?? '';
    const editing = searchParams.get('coupon');
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const search = useDebouncedValue(searchTerm, 300);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && !('coupon' in patch) && { page: 1 }) }).forEach(([key, value]) => (value === '' || value == null || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    useEffect(() => {
        if (search !== searchQuery) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setResult(await couponsApi.list({ state, search: searchQuery, page }));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [state, searchQuery, page]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async (coupon) => {
        try {
            await couponsApi.setActive(coupon.coupon_id, !coupon.is_active);
            toast.success(coupon.is_active ? t('تم إيقاف الكوبون') : t('تم تفعيل الكوبون'));
            load();
        } catch (toggleError) {
            toast.error(t('تعذر تحديث الكوبون'), toggleError.message);
        }
    };

    const remove = async () => {
        setBusy(true);

        try {
            await couponsApi.remove(deleting.coupon_id);
            toast.success(t('تم حذف الكوبون'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر حذف الكوبون'), removeError.errors?.coupon ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    const summary = result?.summary;
    const tabs = useMemo(() => [{ value: '', label: t('كل الكوبونات'), count: summary?.total }, ...Object.entries(COUPON_STATES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] }))], [summary]);
    const coupons = result?.data ?? [];

    return (
        <>
            <PageHeader
                title={t('الكوبونات')}
                description={t('أكواد خصم يكتبها العميل عند إتمام الطلب')}
                breadcrumbs={[t('لوحة التحكم'), t('التسويق'), t('الكوبونات')]}
                actions={
                    <Button icon="plus" onClick={() => setQuery({ coupon: 'new' })}>
                        {t('كوبون جديد')}
                    </Button>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <StatCard label={t('كوبونات فعّالة')} value={summary ? formatNumber(summary.active) : '—'} icon="gift" tone="success" hint={summary?.scheduled ? t('و{count} مجدول', { count: formatNumber(summary.scheduled) }) : undefined} />
                <StatCard label={t('طلبات استخدمت كوبون')} value={summary ? formatNumber(summary.orders) : '—'} icon="shopping-bag" tone="primary" />
                <StatCard label={t('إجمالي الخصومات')} value={summary ? formatMoney(summary.discounts) : '—'} icon="percent" tone="warning" hint={t('من الطلبات غير الملغاة')} />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={state} onChange={(value) => setQuery({ state: value })} className="px-3" />
                <div className="p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث بالكود...')} aria-label={t('بحث في الكوبونات')} className="lg:w-72" dir="ltr" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الكوبونات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && coupons.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="gift"
                            title={state || searchQuery ? t('لا توجد كوبونات مطابقة') : t('لا توجد كوبونات بعد')}
                            description={t('أنشئ كود خصم لعرض أو مناسبة، أو اربطه بمسوق ليشاركه مع متابعيه.')}
                            action={<Button icon="plus" onClick={() => setQuery({ coupon: 'new' })}>{t('كوبون جديد')}</Button>}
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                            <thead className="border-y border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    {COLUMNS.map((column, index) => (
                                        <th key={index} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={cn('divide-y divide-line transition-opacity', loading && coupons.length > 0 && 'opacity-60')}>
                                {loading && coupons.length === 0
                                    ? Array.from({ length: 4 }, (_, index) => (
                                          <tr key={index}>
                                              {COLUMNS.map((column, columnIndex) => (
                                                  <td key={columnIndex} className="px-4 py-4">
                                                      <Skeleton className="h-4 w-16" />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : coupons.map((coupon) => (
                                          <tr key={coupon.coupon_id} className="transition hover:bg-surface-2">
                                              <td className="px-4 py-3">
                                                  <button type="button" onClick={() => copy(coupon.code)} className="ltr inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-sm font-bold text-primary" title={t('نسخ الكود')}>
                                                      {coupon.code}
                                                      <Icon name={copiedValue === coupon.code ? 'check' : 'copy'} className="size-3.5" />
                                                  </button>
                                                  {coupon.description && <span className="mt-1 block text-xs text-muted">{coupon.description}</span>}
                                                  {coupon.affiliate && <span className="mt-1 block text-xs text-info">{t('كوبون المسوق {name}', { name: coupon.affiliate.full_name })}</span>}
                                              </td>
                                              <td className="px-4 py-3 font-medium whitespace-nowrap text-ink">{describeDiscount(coupon)}</td>
                                              <td className="px-4 py-3 text-xs text-ink-2">{describeConditions(coupon).join(' · ') || '—'}</td>
                                              <td className="px-4 py-3 whitespace-nowrap text-ink-2">
                                                  <Link to={`/dashboard/orders?coupon_id=${coupon.coupon_id}`} className="hover:text-primary hover:underline">
                                                      {coupon.usage_limit ? t('{uses} من {limit}', { uses: formatNumber(coupon.stats.uses), limit: formatNumber(coupon.usage_limit) }) : formatNumber(coupon.stats.uses)}
                                                  </Link>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                  <span className="block font-semibold text-ink">{formatMoney(coupon.stats.discount_total)}</span>
                                                  <span className="text-xs text-muted">{t('مبيعات {value}', { value: formatMoney(coupon.stats.sales_total) })}</span>
                                              </td>
                                              <td className="px-4 py-3">
                                                  <Badge tone={COUPON_STATES[coupon.state].tone} dot>
                                                      {COUPON_STATES[coupon.state].label}
                                                  </Badge>
                                              </td>
                                              <td className="px-4 py-3">
                                                  <Dropdown
                                                      label={t('إجراءات {name}', { name: coupon.code })}
                                                      trigger={(props) => (
                                                          <button type="button" {...props} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink">
                                                              <Icon name="more-vertical" className="size-[18px]" />
                                                          </button>
                                                      )}
                                                      items={[
                                                          { label: t('تعديل'), icon: 'edit', onClick: () => setQuery({ coupon: coupon.coupon_id }) },
                                                          {
                                                              label: t('نسخ رابط الكوبون'),
                                                              icon: 'link',
                                                              onClick: () => {
                                                                  copy(coupon.url);
                                                                  toast.success(t('تم نسخ رابط الكوبون'), t('من يفتح الرابط يُطبَّق عليه الخصم تلقائياً عند إتمام الطلب.'));
                                                              },
                                                          },
                                                          { label: t('عرض الطلبات'), icon: 'shopping-bag', onClick: () => navigate(`/dashboard/orders?coupon_id=${coupon.coupon_id}`) },
                                                          { label: coupon.is_active ? t('إيقاف') : t('تفعيل'), icon: coupon.is_active ? 'eye-off' : 'check-circle', onClick: () => toggle(coupon) },
                                                          { divider: true },
                                                          { label: t('حذف'), icon: 'trash', tone: 'danger', onClick: () => setDeleting(coupon), disabled: coupon.stats.uses > 0, hint: coupon.stats.uses > 0 ? t('مستخدم في طلبات') : undefined },
                                                      ]}
                                                  />
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>

            <CouponFormDrawer
                open={Boolean(editing)}
                couponId={editing && editing !== 'new' ? editing : null}
                onClose={() => setQuery({ coupon: '' })}
                onSaved={() => {
                    setQuery({ coupon: '' });
                    load();
                }}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف الكوبون؟')}
                description={deleting ? t('سيتم حذف الكوبون {code} نهائياً.', { code: deleting.code }) : ''}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
