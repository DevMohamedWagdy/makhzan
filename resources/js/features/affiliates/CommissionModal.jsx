import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, OptionCards, Switch, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { AFFILIATE_TIERS, CURRENCY } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { formatCommission } from './AffiliateBadges';

const SAMPLE_ORDER = 1000;
const LIMITS = { percentage: [0.5, 50], fixed: [1, 5000] };

export function CommissionModal({ affiliate, open, onClose, onSave, saving }) {
    const tierDefault = AFFILIATE_TIERS[affiliate?.tier]?.default_commission ?? 0;
    const [useTierDefault, setUseTierDefault] = useState(true);
    const [type, setType] = useState('percentage');
    const [value, setValue] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && affiliate) {
            const override = affiliate.commission_override;

            setUseTierDefault(!override);
            setType(override?.type ?? 'percentage');
            setValue(String(override?.value ?? tierDefault));
            setNote(override?.note ?? '');
            setError(null);
        }
    }, [open, affiliate, tierDefault]);

    if (!affiliate) {
        return null;
    }

    const numeric = Number(value);
    const [min, max] = LIMITS[type];
    const preview = useTierDefault ? (SAMPLE_ORDER * tierDefault) / 100 : type === 'percentage' ? (SAMPLE_ORDER * numeric) / 100 : numeric;

    const submit = () => {
        if (!useTierDefault && (Number.isNaN(numeric) || numeric < min || numeric > max)) {
            setError(type === 'percentage' ? `أدخل نسبة بين ${min}% و ${max}%` : `أدخل مبلغاً بين ${min} و ${max} ${CURRENCY}`);

            return;
        }

        onSave({ use_tier_default: useTierDefault, type, value: numeric, note: note.trim() || null });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!saving}
            icon="percent"
            iconTone="warning"
            title="تخصيص عمولة استثنائية"
            description={`حدد عمولة خاصة لـ ${affiliate.full_name} بدلاً من عمولة شريحته الافتراضية.`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        إلغاء
                    </Button>
                    <Button onClick={submit} loading={saving} icon="check">
                        حفظ العمولة
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-line bg-surface-2 p-4">
                    <Switch
                        checked={useTierDefault}
                        onChange={setUseTierDefault}
                        label={`استخدام عمولة الشريحة (${AFFILIATE_TIERS[affiliate.tier].label} — ${tierDefault}%)`}
                        description="أوقف هذا الخيار لتعيين عمولة مختلفة لهذا المسوق فقط."
                    />
                </div>

                {!useTierDefault && (
                    <div className="animate-pop flex flex-col gap-5">
                        <OptionCards
                            columns={2}
                            value={type}
                            onChange={(nextType) => {
                                setType(nextType);
                                setError(null);
                            }}
                            options={[
                                { value: 'percentage', label: 'نسبة مئوية', icon: 'percent', description: 'نسبة من قيمة كل طلب' },
                                { value: 'fixed', label: 'مبلغ ثابت', icon: 'wallet', description: 'مبلغ محدد عن كل طلب' },
                            ]}
                        />
                        <Field label={type === 'percentage' ? 'نسبة العمولة' : 'قيمة العمولة لكل طلب'} error={error} required>
                            {(props) => (
                                <Input
                                    {...props}
                                    data-autofocus
                                    type="number"
                                    inputMode="decimal"
                                    min={min}
                                    max={max}
                                    step={type === 'percentage' ? 0.5 : 1}
                                    value={value}
                                    onChange={(event) => {
                                        setValue(event.target.value);
                                        setError(null);
                                    }}
                                    aria-invalid={error ? 'true' : undefined}
                                    suffix={<span className="px-2 text-sm text-muted">{type === 'percentage' ? '%' : CURRENCY}</span>}
                                />
                            )}
                        </Field>
                        <Field label="سبب التخصيص" optional hint="ملاحظة داخلية لا تظهر للمسوق">
                            {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: اتفاق خاص لموسم رمضان" maxLength={200} />}
                        </Field>
                    </div>
                )}

                <Alert tone="info" icon="info">
                    على طلب بقيمة {formatMoney(SAMPLE_ORDER)} سيحصل المسوق على <strong>{formatMoney(Number.isNaN(preview) ? 0 : preview)}</strong>
                    {!useTierDefault && value && ` (${formatCommission({ type, value: numeric || 0 })})`}.
                </Alert>
            </div>
        </Modal>
    );
}
