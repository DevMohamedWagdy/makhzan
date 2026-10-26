import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { DropZone } from '@/components/ui/Upload';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { AFFILIATE_TIERS, BULK_IMPORT_COLUMNS, MAX_IMPORT_SIZE_MB, PAYOUT_METHODS } from '@/lib/constants';
import { csvToObjects, downloadCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import { isEmail, isPhone, normalizePhone } from '@/lib/validators';
import { affiliatesApi } from '@/services/affiliatesApi';

const ACCEPT = '.csv,text/csv';

/** Accept both machine keys ("vip") and the labels vendors are likely to type, in the dashboard language. */
function resolveKey(value, map) {
    const needle = String(value ?? '').trim().toLowerCase();

    return Object.entries(map).find(([key, config]) => key === needle || config.label.toLowerCase() === needle)?.[0] ?? null;
}

/** Client-side preview only; the server re-validates every row on import. */
function validateRow(row, seenPhones) {
    const errors = [];
    const phone = normalizePhone(row.phone);
    const tier = row.tier ? resolveKey(row.tier, AFFILIATE_TIERS) : 'new';
    const payoutType = row.payout_type ? resolveKey(row.payout_type, PAYOUT_METHODS) : 'vodafone_cash';

    if (!row.full_name) {
        errors.push(t('الاسم مطلوب'));
    }

    if (!isPhone(phone)) {
        errors.push(t('رقم الهاتف غير صحيح'));
    } else if (seenPhones.has(phone)) {
        errors.push(t('رقم مكرر في الملف'));
    }

    // Affiliates sign in with their email, so every row needs one.
    if (!row.email) {
        errors.push(t('البريد الإلكتروني مطلوب'));
    } else if (!isEmail(row.email)) {
        errors.push(t('البريد غير صحيح'));
    }

    if (!tier) {
        errors.push(t('شريحة غير معروفة'));
    }

    if (!payoutType) {
        errors.push(t('وسيلة سحب غير معروفة'));
    }

    seenPhones.add(phone);

    // Send the keys, not the typed labels: labels depend on the dashboard language.
    return { errors, resolved: { tier, payout_type: payoutType } };
}

function downloadTemplate() {
    downloadCsv('sellygrow-affiliates-template.csv', [
        BULK_IMPORT_COLUMNS,
        [t('سارة محمود'), '01012345678', 'sara@example.com', 'general', 'vodafone_cash', t('سارة محمود'), '01012345678'],
        [t('أحمد علي'), '01198765432', 'ahmed@example.com', 'vip', 'instapay', t('أحمد علي'), 'ahmed@instapay'],
    ]);
}

export function BulkImportPanel({ onImported }) {
    const toast = useToast();
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const validated = useMemo(() => {
        if (!rows) {
            return null;
        }

        const seenPhones = new Set();

        return rows.map((row, index) => ({ line: index + 2, row, ...validateRow(row, seenPhones) }));
    }, [rows]);

    const validRows = validated?.filter((entry) => entry.errors.length === 0) ?? [];
    const invalidRows = validated?.filter((entry) => entry.errors.length > 0) ?? [];

    const onFile = async (picked) => {
        setFile(picked);
        setResult(null);
        setRows(null);

        const parsed = csvToObjects(await picked.text());
        const missing = ['full_name', 'phone'].filter((column) => !(parsed[0] && column in parsed[0]));

        if (!parsed.length) {
            setFileError(t('الملف فارغ أو لا يحتوي على صفوف بيانات'));
        } else if (missing.length) {
            setFileError(t('الأعمدة المطلوبة غير موجودة: {value}. استخدم القالب الجاهز.', { value: missing.join('، ') }));
        } else {
            setRows(parsed);
        }
    };

    const clear = () => {
        setFile(null);
        setRows(null);
        setFileError(null);
        setResult(null);
    };

    const runImport = async () => {
        setImporting(true);

        try {
            // The server re-validates every row; the preview above is only for fast feedback.
            const response = await affiliatesApi.importRows(validRows.map((entry) => ({ ...entry.row, ...entry.resolved, line: entry.line })));

            setResult(response);
            toast.success(t('تم استيراد {value} مسوق بنجاح', { value: formatNumber(response.imported) }));
            onImported();
        } catch (error) {
            toast.error(t('فشل الاستيراد'), error.message);
        } finally {
            setImporting(false);
        }
    };

    if (result) {
        return (
            <div className="animate-pop flex flex-col items-center gap-4 p-10 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
                    <Icon name="check-circle" className="size-8" />
                </span>
                <h3 className="text-lg font-semibold text-ink">{t('اكتمل الاستيراد')}</h3>
                <p className="text-sm leading-relaxed text-muted">
                    {t('تمت إضافة {count} مسوق', { count: formatNumber(result.imported) })}
                    {result.skipped > 0 && ` ${t('وتم تخطي {count} صف', { count: formatNumber(result.skipped) })}`}
                    {t('. سيحتاج المسوقون المستوردون إلى تعيين كلمة مرور قبل أول تسجيل دخول.')}
                </p>
                {result.errors.length > 0 && (
                    <ul className="w-full max-w-md text-start text-xs text-danger">
                        {result.errors.map((error) => (
                            <li key={error.row}>
                                {t('صف {row}: {message}', { row: error.row, message: error.message })}
                            </li>
                        ))}
                    </ul>
                )}
                <Button variant="secondary" icon="upload" onClick={clear}>
                    {t('رفع ملف آخر')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-4">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
                        <Icon name="file-spreadsheet" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-ink">{t('ابدأ بالقالب الجاهز')}</p>
                        <p className="text-xs text-muted">{t('يحتوي على الأعمدة المطلوبة وأمثلة للتعبئة')}</p>
                    </div>
                </div>
                <Button variant="secondary" size="sm" icon="download" onClick={downloadTemplate}>
                    {t('تحميل القالب (CSV)')}
                </Button>
            </div>

            <DropZone
                accept={ACCEPT}
                maxSizeMb={MAX_IMPORT_SIZE_MB}
                file={file}
                onFile={onFile}
                onClear={clear}
                onError={setFileError}
                title={t('اسحب ملف المسوقين وأفلته هنا، أو اضغط للاختيار')}
                description={t('ملف CSV بحد أقصى {MAX_IMPORT_SIZE_MB} ميجابايت و 1000 صف — لملفات Excel: احفظها بصيغة CSV أولاً', { MAX_IMPORT_SIZE_MB })}
            />

            {fileError && <Alert tone="danger">{fileError}</Alert>}

            {validated && (
                <div className="mk-card overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                        <p className="me-auto text-sm font-semibold text-ink">{t('معاينة البيانات')}</p>
                        <Badge tone="success" icon="check">
                            {t('{value} صالح', { value: formatNumber(validRows.length) })}
                        </Badge>
                        {invalidRows.length > 0 && (
                            <Badge tone="danger" icon="alert-circle">
                                {t('{value} به أخطاء', { value: formatNumber(invalidRows.length) })}
                            </Badge>
                        )}
                    </div>
                    <div className="mk-scroll max-h-72 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="mk-thead sticky top-0">
                                <tr>
                                    <th className="px-4 py-2.5 text-start font-medium">#</th>
                                    <th className="px-4 py-2.5 text-start font-medium">{t('الاسم')}</th>
                                    <th className="px-4 py-2.5 text-start font-medium">{t('الهاتف')}</th>
                                    <th className="px-4 py-2.5 text-start font-medium">{t('الحالة')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {validated.map((entry) => (
                                    <tr key={entry.line} className={entry.errors.length ? 'bg-danger-soft/50' : undefined}>
                                        <td className="px-4 py-2.5 text-muted">{entry.line}</td>
                                        <td className="px-4 py-2.5 text-ink">{entry.row.full_name || '—'}</td>
                                        <td className="ltr px-4 py-2.5 text-start text-ink-2">{entry.row.phone || '—'}</td>
                                        <td className="px-4 py-2.5">
                                            {entry.errors.length ? <span className="text-xs text-danger">{entry.errors.join(t('، '))}</span> : <Icon name="check-circle" className="size-[18px] text-success" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {file && !fileError && (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{invalidRows.length > 0 ? t('سيتم تخطي الصفوف التي بها أخطاء.') : t('المسوقون المستوردون يبدأون بحالة «نشط».')}</p>
                    <Button icon="upload" loading={importing} onClick={runImport} disabled={validRows.length === 0}>
                        {t('استيراد {value} مسوق', { value: formatNumber(validRows.length) })}
                    </Button>
                </div>
            )}
        </div>
    );
}
