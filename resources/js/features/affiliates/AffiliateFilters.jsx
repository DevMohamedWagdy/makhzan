import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Navigation';
import { AFFILIATE_STATUSES, AFFILIATE_TIERS, PAYOUT_METHODS, PER_PAGE_OPTIONS } from '@/lib/constants';

const toOptions = (map) => Object.entries(map).map(([value, config]) => ({ value, label: config.label }));

export function AffiliateStatusTabs({ value, onChange, summary }) {
    const tabs = [
        { value: '', label: 'كل المسوقين', count: summary?.total },
        { value: 'active', label: AFFILIATE_STATUSES.active.label, count: summary?.active },
        { value: 'pending', label: AFFILIATE_STATUSES.pending.label, count: summary?.pending },
        { value: 'frozen', label: AFFILIATE_STATUSES.frozen.label, count: summary?.frozen },
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
                    placeholder="ابحث بالاسم أو رقم الهاتف أو كود الإحالة..."
                    aria-label="بحث في المسوقين"
                />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
                <Select aria-label="فلترة حسب الشريحة" value={filters.tier} onChange={(event) => onChange({ tier: event.target.value })} placeholder="كل الشرائح" options={toOptions(AFFILIATE_TIERS)} className="lg:w-40" />
                <Select aria-label="فلترة حسب وسيلة السحب" value={filters.payout_method} onChange={(event) => onChange({ payout_method: event.target.value })} placeholder="كل وسائل السحب" options={toOptions(PAYOUT_METHODS)} className="lg:w-44" />
                <Select
                    aria-label="عدد النتائج في الصفحة"
                    value={filters.per_page}
                    onChange={(event) => onChange({ per_page: Number(event.target.value) })}
                    options={PER_PAGE_OPTIONS.map((count) => ({ value: count, label: `${count} في الصفحة` }))}
                    className="lg:w-36"
                />
            </div>
            {hasActiveFilters && (
                <Button variant="ghost" icon="x" onClick={onReset} className="lg:ms-auto">
                    مسح الفلاتر
                </Button>
            )}
        </div>
    );
}
