import { Field, Input, Select } from '@/components/ui/Form';
import { t } from '@/i18n';
import { GOVERNORATES, findGovernorate } from '@/lib/locations';

export const EMPTY_ADDRESS = { recipient_name: '', phone: '', governorate_id: '', city_id: '', address_line: '', landmark: '' };

/**
 * Delivery address inputs. `deliverable` (governorate ids) disables governorates the store
 * doesn't ship to; `errors` uses the field names (recipient_name, phone, ...).
 */
export function AddressFields({ value, onChange, errors = {}, deliverable = null }) {
    const set = (patch) => onChange({ ...value, ...patch });
    const cities = findGovernorate(value.governorate_id)?.cities ?? [];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('اسم المستلم')} required error={errors.recipient_name}>
                {(props) => <Input {...props} value={value.recipient_name} onChange={(event) => set({ recipient_name: event.target.value })} autoComplete="name" aria-invalid={errors.recipient_name ? 'true' : undefined} />}
            </Field>
            <Field label={t('رقم هاتف المستلم')} required error={errors.phone}>
                {(props) => <Input {...props} type="tel" dir="ltr" inputMode="tel" className="text-start" value={value.phone} onChange={(event) => set({ phone: event.target.value })} autoComplete="tel" placeholder="01012345678" aria-invalid={errors.phone ? 'true' : undefined} />}
            </Field>
            <Field label={t('المحافظة')} required error={errors.governorate_id}>
                {(props) => (
                    <Select
                        {...props}
                        value={value.governorate_id}
                        onChange={(event) => set({ governorate_id: event.target.value, city_id: '' })}
                        placeholder={t('اختر المحافظة')}
                        options={GOVERNORATES.map((governorate) => ({ value: governorate.id, label: deliverable && !deliverable.includes(governorate.id) ? t('{name} (لا يتوفر التوصيل)', { name: governorate.name }) : governorate.name, disabled: deliverable ? !deliverable.includes(governorate.id) : false }))}
                        aria-invalid={errors.governorate_id ? 'true' : undefined}
                    />
                )}
            </Field>
            <Field label={t('المدينة / المنطقة')} required error={errors.city_id}>
                {(props) => (
                    <Select
                        {...props}
                        value={value.city_id}
                        onChange={(event) => set({ city_id: event.target.value })}
                        placeholder={value.governorate_id ? t('اختر المدينة') : t('اختر المحافظة أولاً')}
                        disabled={!value.governorate_id}
                        options={cities.map((city) => ({ value: city.id, label: city.name }))}
                        aria-invalid={errors.city_id ? 'true' : undefined}
                    />
                )}
            </Field>
            <Field label={t('العنوان بالتفصيل')} required error={errors.address_line} className="sm:col-span-2">
                {(props) => <Input {...props} value={value.address_line} onChange={(event) => set({ address_line: event.target.value })} placeholder={t('اسم الشارع، رقم العقار، الدور والشقة')} autoComplete="street-address" aria-invalid={errors.address_line ? 'true' : undefined} />}
            </Field>
            <Field label={t('علامة مميزة')} optional className="sm:col-span-2">
                {(props) => <Input {...props} value={value.landmark ?? ''} onChange={(event) => set({ landmark: event.target.value })} placeholder={t('مثال: بجوار مسجد النور')} maxLength={150} />}
            </Field>
        </div>
    );
}

/** One-line address for summaries, e.g. "5 شارع 9، المعادي، القاهرة". */
export function formatAddress(address) {
    const governorate = findGovernorate(address.governorate_id);
    const city = governorate?.cities.find((candidate) => candidate.id === address.city_id);

    return [address.address_line, city?.name, governorate?.name].filter(Boolean).join(t('، '));
}
