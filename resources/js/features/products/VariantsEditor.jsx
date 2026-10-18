import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { CURRENCY, OPTION_SUGGESTIONS } from '@/lib/constants';
import { cn, formatNumber } from '@/lib/format';
import { combinations, comboKey, isPerWarehouse, syncRows, warehouseStockOf } from './variants';

const MAX_OPTIONS = 3;

/** Chips with a text box: Enter or comma adds a value, Backspace on an empty box removes the last. */
function ValuesInput({ values, onChange, invalid, placeholder }) {
    const [draft, setDraft] = useState('');

    const commit = (text = draft) => {
        const additions = text
            .split(/[,،]/)
            .map((value) => value.trim())
            .filter((value) => value && !values.some((existing) => existing.toLowerCase() === value.toLowerCase()));

        if (additions.length) {
            onChange([...values, ...additions]);
        }

        setDraft('');
    };

    return (
        <div className={cn('mk-input flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5', invalid && 'border-danger')}>
            {values.map((value) => (
                <span key={value} className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                    {value}
                    <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} className="hover:text-danger" aria-label={t('حذف {value}', { value })}>
                        <Icon name="x" className="size-3" />
                    </button>
                </span>
            ))}
            <input
                value={draft}
                onChange={(event) => (/[,،]/.test(event.target.value) ? commit(event.target.value) : setDraft(event.target.value))}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit();
                    } else if (event.key === 'Backspace' && draft === '' && values.length) {
                        onChange(values.slice(0, -1));
                    }
                }}
                onBlur={() => commit()}
                placeholder={values.length ? t('أضف قيمة...') : placeholder}
                className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                aria-label={t('قيم الخيار')}
            />
        </div>
    );
}

function PriceInputs({ row, errors, prefix, onChange, warehouses, compact = false }) {
    const fieldClass = compact ? 'h-9 text-sm' : '';
    const money = <span className="px-2 text-xs text-muted">{CURRENCY}</span>;

    const perWarehouse = isPerWarehouse(warehouses);
    const setWarehouseStock = (warehouseId, stock) => onChange({ warehouseStocks: { ...row.warehouseStocks, [warehouseId]: stock } });
    const warehouseInput = (warehouse, props) => (
        <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={warehouseStockOf(row, warehouse.warehouse_id)}
            onChange={(event) => setWarehouseStock(warehouse.warehouse_id, event.target.value)}
            aria-invalid={errors[`${prefix}.warehouse_stocks`] ? 'true' : undefined}
            aria-label={t('الكمية في {warehouse}', { warehouse: warehouse.name })}
            className={fieldClass}
            {...props}
        />
    );

    const input = (field, props) => (
        <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={row[field]}
            onChange={(event) => onChange({ [field]: event.target.value })}
            aria-invalid={errors[`${prefix}.${field}`] ? 'true' : undefined}
            className={fieldClass}
            {...props}
        />
    );

    if (compact) {
        return (
            <>
                <td className="px-2 py-2">
                    {input('price', { suffix: money, 'aria-label': t('السعر') })}
                    {errors[`${prefix}.price`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.price`]}</p>}
                </td>
                <td className="px-2 py-2">
                    {input('compare_at_price', { suffix: money, 'aria-label': t('السعر قبل الخصم'), placeholder: '—' })}
                    {errors[`${prefix}.compare_at_price`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.compare_at_price`]}</p>}
                </td>
                <td className="px-2 py-2">
                    {input('cost', { suffix: money, 'aria-label': t('التكلفة'), placeholder: '—' })}
                    {errors[`${prefix}.cost`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.cost`]}</p>}
                </td>
                <td className="px-2 py-2">
                    <Input value={row.sku} onChange={(event) => onChange({ sku: event.target.value })} dir="ltr" className={cn(fieldClass, 'text-start')} aria-label="SKU" placeholder="—" maxLength={60} aria-invalid={errors[`${prefix}.sku`] ? 'true' : undefined} />
                    {errors[`${prefix}.sku`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.sku`]}</p>}
                </td>
                {perWarehouse ? (
                    warehouses.map((warehouse, index) => (
                        <td key={warehouse.warehouse_id} className="px-2 py-2">
                            {warehouseInput(warehouse)}
                            {index === 0 && errors[`${prefix}.warehouse_stocks`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.warehouse_stocks`]}</p>}
                        </td>
                    ))
                ) : (
                    <td className="px-2 py-2">
                        {input('stock', { step: 1, 'aria-label': t('الكمية') })}
                        {errors[`${prefix}.stock`] && <p className="mt-1 text-[11px] text-danger">{errors[`${prefix}.stock`]}</p>}
                    </td>
                )}
            </>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('سعر البيع')} required error={errors[`${prefix}.price`]}>
                {(props) => input('price', { ...props, suffix: money, placeholder: '0' })}
            </Field>
            <Field label={t('السعر قبل الخصم')} optional error={errors[`${prefix}.compare_at_price`]} hint={t('يظهر مشطوباً بجانب السعر')}>
                {(props) => input('compare_at_price', { ...props, suffix: money })}
            </Field>
            <Field label={t('تكلفة القطعة')} optional error={errors[`${prefix}.cost`]} hint={t('لا تظهر للعملاء، وتُستخدم لحساب الأرباح')}>
                {(props) => input('cost', { ...props, suffix: money })}
            </Field>
            <Field label={t('رمز المنتج (SKU)')} optional error={errors[`${prefix}.sku`]}>
                {(props) => <Input {...props} value={row.sku} onChange={(event) => onChange({ sku: event.target.value })} dir="ltr" className="text-start" placeholder="NF-1001" maxLength={60} />}
            </Field>
            {perWarehouse ? (
                <fieldset className="flex flex-col gap-2 sm:col-span-2">
                    <legend className="mb-1.5 text-sm font-medium text-ink">
                        {t('الكمية المتاحة في كل مخزن')} <span className="text-danger">*</span>
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {warehouses.map((warehouse) => (
                            <label key={warehouse.warehouse_id} className="flex flex-col gap-1.5">
                                <span className="text-xs text-muted">{warehouse.name}</span>
                                {warehouseInput(warehouse, { 'aria-label': undefined })}
                            </label>
                        ))}
                    </div>
                    {errors[`${prefix}.warehouse_stocks`] ? (
                        <p className="text-xs text-danger">{errors[`${prefix}.warehouse_stocks`]}</p>
                    ) : (
                        <p className="text-xs text-muted">{t('الإجمالي: {count} قطعة', { count: formatNumber(warehouses.reduce((total, warehouse) => total + (Number(warehouseStockOf(row, warehouse.warehouse_id)) || 0), 0)) })}</p>
                    )}
                </fieldset>
            ) : (
                <Field label={t('الكمية المتاحة')} required error={errors[`${prefix}.stock`]}>
                    {(props) => input('stock', { ...props, step: 1 })}
                </Field>
            )}
        </div>
    );
}

/**
 * Pricing and stock: a single price/stock for simple products, or options (size, color…)
 * with one row per combination. `value` is the state described in ./variants.js.
 * With more than one of the store's `warehouses`, quantities are entered per warehouse.
 */
export function VariantsEditor({ value, onChange, errors, warehouses = null }) {
    const suggestionsId = useId();
    const [bulk, setBulk] = useState({ price: '', stock: '' });
    const update = (patch) => onChange(syncRows({ ...value, ...patch }));
    const updateRow = (key, patch) => onChange({ ...value, rows: { ...value.rows, [key]: { ...value.rows[key], ...patch } } });
    const setOption = (index, patch) => update({ options: value.options.map((option, position) => (position === index ? { ...option, ...patch } : option)) });
    const combos = combinations(value.options);
    const perWarehouse = isPerWarehouse(warehouses);
    const stockColumns = perWarehouse ? warehouses.length : 1;

    const toggleOptions = (enabled) => {
        if (enabled && value.options.length === 0) {
            update({ hasOptions: true, options: [{ name: t('المقاس'), values: [] }] });
        } else {
            update({ hasOptions: enabled });
        }
    };

    const applyBulk = () => {
        const rows = { ...value.rows };

        combos.forEach((values) => {
            const key = comboKey(values);

            rows[key] = { ...rows[key], ...(bulk.price !== '' && { price: bulk.price }), ...(bulk.stock !== '' && { stock: bulk.stock }) };
        });
        onChange({ ...value, rows });
        setBulk({ price: '', stock: '' });
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-line bg-surface-2 p-4">
                <Switch checked={value.hasOptions} onChange={toggleOptions} label={t('المنتج له مقاسات أو ألوان')} description={t('فعّله لتحديد سعر وكمية لكل تركيبة، مثل: أسود / L.')} />
            </div>

            {!value.hasOptions ? (
                <PriceInputs row={value.simple} errors={errors} prefix="simple" warehouses={warehouses} onChange={(patch) => onChange({ ...value, simple: { ...value.simple, ...patch } })} />
            ) : (
                <>
                    <datalist id={suggestionsId}>
                        {OPTION_SUGGESTIONS.map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                        ))}
                    </datalist>

                    <div className="flex flex-col gap-3">
                        {value.options.map((option, index) => (
                            <div key={index} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[180px_1fr_auto] sm:items-start">
                                <div>
                                    <Input list={suggestionsId} value={option.name} onChange={(event) => setOption(index, { name: event.target.value })} placeholder={t('اسم الخيار')} aria-label={t('اسم الخيار {value}', { value: index + 1 })} maxLength={30} aria-invalid={errors[`options.${index}.name`] ? 'true' : undefined} />
                                    {errors[`options.${index}.name`] && <p className="mt-1 text-xs text-danger">{errors[`options.${index}.name`]}</p>}
                                </div>
                                <div>
                                    <ValuesInput values={option.values} onChange={(values) => setOption(index, { values })} invalid={Boolean(errors[`options.${index}.values`])} placeholder={option.name === t('اللون') ? t('مثال: أسود، أحمر') : t('مثال: S، M، L')} />
                                    {errors[`options.${index}.values`] && <p className="mt-1 text-xs text-danger">{errors[`options.${index}.values`]}</p>}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => update({ options: value.options.filter((_, position) => position !== index) })} aria-label={t('حذف الخيار {name}', { name: option.name })} title={t('حذف الخيار')}>
                                    <Icon name="trash" className="size-4" />
                                </Button>
                            </div>
                        ))}
                        {errors.options && <p className="text-xs text-danger">{errors.options}</p>}
                        {value.options.length < MAX_OPTIONS && (
                            <Button variant="soft" size="sm" icon="plus" className="self-start" onClick={() => update({ options: [...value.options, { name: value.options.some((option) => option.name === t('اللون')) ? '' : t('اللون'), values: [] }] })}>
                                {t('إضافة خيار')}
                            </Button>
                        )}
                    </div>

                    {combos.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-line">
                            <div className="flex flex-wrap items-end gap-2 border-b border-line bg-surface-2 p-3">
                                <p className="me-auto text-sm font-semibold text-ink">
                                    {t('التركيبات')} <span className="font-normal text-muted">({t('{count} من {total}', { count: combos.filter((values) => value.rows[comboKey(values)]?.enabled).length, total: combos.length })})</span>
                                </p>
                                <Input type="number" min={0} value={bulk.price} onChange={(event) => setBulk({ ...bulk, price: event.target.value })} placeholder={t('سعر للكل')} className="h-9 w-28 text-sm" aria-label={t('سعر لكل التركيبات')} />
                                {!perWarehouse && <Input type="number" min={0} value={bulk.stock} onChange={(event) => setBulk({ ...bulk, stock: event.target.value })} placeholder={t('كمية للكل')} className="h-9 w-28 text-sm" aria-label={t('كمية لكل التركيبات')} />}
                                <Button size="sm" variant="secondary" onClick={applyBulk} disabled={bulk.price === '' && bulk.stock === ''}>
                                    {t('تطبيق على الكل')}
                                </Button>
                            </div>
                            <div className="mk-scroll overflow-x-auto">
                                <table className="w-full text-sm" style={{ minWidth: 760 + (stockColumns - 1) * 120 }}>
                                    <thead className="text-xs text-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-start font-medium">{t('التركيبة')}</th>
                                            <th className="px-2 py-2 text-start font-medium">{t('السعر')}</th>
                                            <th className="px-2 py-2 text-start font-medium">{t('قبل الخصم')}</th>
                                            <th className="px-2 py-2 text-start font-medium">{t('التكلفة')}</th>
                                            <th className="px-2 py-2 text-start font-medium">SKU</th>
                                            {perWarehouse ? (
                                                warehouses.map((warehouse) => (
                                                    <th key={warehouse.warehouse_id} className="w-24 px-2 py-2 text-start font-medium whitespace-nowrap">
                                                        {t('كمية: {warehouse}', { warehouse: warehouse.name })}
                                                    </th>
                                                ))
                                            ) : (
                                                <th className="w-24 px-2 py-2 text-start font-medium">{t('الكمية')}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {combos.map((values) => {
                                            const key = comboKey(values);
                                            const row = value.rows[key];

                                            return (
                                                <tr key={key} className={cn(!row.enabled && 'bg-surface-2 opacity-60')}>
                                                    <td className="px-3 py-2">
                                                        <label className="flex cursor-pointer items-center gap-2 font-medium whitespace-nowrap text-ink">
                                                            <input type="checkbox" checked={row.enabled} onChange={(event) => updateRow(key, { enabled: event.target.checked })} className="size-4 accent-[var(--color-primary)]" aria-label={t('بيع {value}', { value: values.join(' / ') })} />
                                                            {values.join(' / ')}
                                                        </label>
                                                    </td>
                                                    {row.enabled ? (
                                                        <PriceInputs row={row} errors={errors} prefix={`rows.${key}`} warehouses={warehouses} onChange={(patch) => updateRow(key, patch)} compact />
                                                    ) : (
                                                        <td colSpan={4 + stockColumns} className="px-2 py-2 text-xs text-muted">
                                                            {t('غير متاحة للبيع')}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
