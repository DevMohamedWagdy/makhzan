import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Navigation';
import { t } from '@/i18n';
import { AFFILIATE_STATUSES, AFFILIATE_TIERS, PAYOUT_METHODS, PER_PAGE_OPTIONS } from '@/lib/constants';

const toOptions = (map) => Object.entries(map).map(([value, config]) => ({ value, label: config.label }));

/** Not a status: lists affiliates with an open commission transfer request. */
export const PAYOUT_REQUEST_TAB = 'payout_request';

export function AffiliateStatusTabs({ value, onChange, summary }) {
    const tabs = [
        { value: '', label: t('كل المسوقين'), count: summary?.total },
        { value: 'active', label: AFFILIATE_STATUSES.active.label, count: summary?.active },
        { value: 'pending', label: AFFILIATE_STATUSES.pending.label, count: summary?.pending },
        { value: 'frozen', label: AFFILIATE_STATUSES.frozen.label, count: summary?.frozen },
        { value: PAYOUT_REQUEST_TAB, label: t('طلبات تحويل'), count: summary?.payout_requests },
    ];

    return <Tabs tabs={tabs} value={value} onChange={onChange} className="px-3" />;
}

export function AffiliateFilters({ filters, onChange, onReset, hasActiveFilters }) {
    return (
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="lg:w-80">
                <Input
                    type="search"
                    icon="search"
                    value={filters.search}
                    onChange={(event) => onChange({ search: event.target.value })}
                    placeholder={t('ابحث بالاسم أو رقم الهاتف أو كود الإحالة...')}
                    aria-label={t('بحث في المسوقين')}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
                <Select aria-label={t('فلترة حسب الشريحة')} value={filters.tier} onChange={(event) => onChange({ tier: event.target.value })} placeholder={t('كل الشرائح')} options={toOptions(AFFILIATE_TIERS)} className="lg:w-40" />
                <Select aria-label={t('فلترة حسب وسيلة السحب')} value={filters.payout_method} onChange={(event) => onChange({ payout_method: event.target.value })} placeholder={t('كل وسائل السحب')} options={toOptions(PAYOUT_METHODS)} className="lg:w-44" />
                <Select
                    aria-label={t('عدد النتائج في الصفحة')}
                    value={filters.per_page}
                    onChange={(event) => onChange({ per_page: Number(event.target.value) })}
                    options={PER_PAGE_OPTIONS.map((count) => ({ value: count, label: t('{count} في الصفحة', { count }) }))}
                    className="lg:w-36"
                />
            </div>
            {hasActiveFilters && (
                <Button variant="ghost" icon="x" onClick={onReset} className="lg:ms-auto">
                    {t('مسح الفلاتر')}
                </Button>
            )}
        </div>
    );
}
