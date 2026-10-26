import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Select } from '@/components/ui/Form';
import { DropZone } from '@/components/ui/Upload';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { csvToObjects, downloadCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';
import { useWarehouses } from './useWarehouses';
import { stockIn } from './WarehouseModals';

const HEADER = ['variant_id', 'sku', 'product', 'variant', 'stock', 'cost', 'price'];
const MAX_ROWS = 2000;

/**
 * Stock count by spreadsheet for one warehouse: download its current stock as CSV (opens in
 * Excel), edit the `stock` and `cost` columns, then upload it back. Other columns are for
 * reference only.
 */
export function InventoryImportModal({ open, onClose, onImported }) {
    const toast = useToast();
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const { warehouses } = useWarehouses();
    const [warehouseId, setWarehouseId] = useState('');
    const selectedWarehouse = warehouseId || (warehouses?.[0] ? String(warehouses[0].warehouse_id) : '');

    const reset = () => {
        setFile(null);
        setRows(null);
        setError(null);
        setResult(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const exportStock = async () => {
        setExporting(true);

        try {
            const { data } = await inventoryApi.exportAll();

            downloadCsv(`sellygrow-inventory-${new Date().toISOString().slice(0, 10)}.csv`, [
                HEADER,
                ...data.map((item) => [item.variant_id, item.sku ?? '', item.product_name, item.variant_title ?? '', selectedWarehouse ? stockIn(item, selectedWarehouse) : item.stock, item.cost ?? '', item.price]),
            ]);
        } catch (exportError) {
            toast.error(t('تعذر تصدير المخزون'), exportError.message);
        } finally {
            setExporting(false);
        }
    };

    const pick = async (picked) => {
        reset();
        setFile(picked);

        const parsed = csvToObjects(await picked.text()).map((row, index) => ({ line: index + 2, variant_id: row.variant_id, sku: row.sku, stock: row.stock, cost: row.cost }));

        if (parsed.length === 0) {
            setError(t('الملف لا يحتوي على صفوف'));
        } else if (parsed.length > MAX_ROWS) {
            setError(t('الحد الأقصى {max} صف في الملف', { max: formatNumber(MAX_ROWS) }));
        } else if (!parsed.some((row) => row.variant_id || row.sku)) {
            setError(t('لم نجد عمود variant_id أو sku. استخدم ملف التصدير كقالب.'));
        } else {
            setRows(parsed);
        }
    };

    const submit = async () => {
        setImporting(true);

        try {
            const response = await inventoryApi.importRows(rows, selectedWarehouse ? Number(selectedWarehouse) : undefined);

            setResult(response);
            onImported();
        } catch (importError) {
            setError(importError.errors?.rows ?? importError.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal open={open} onClose={close} dismissible={!importing} size="lg" icon="file-spreadsheet" title={t('جرد بملف Excel')} description={t('صدّر المخزون، عدّل عمودي الكمية والتكلفة، ثم ارفع الملف.')}>
            <div className="flex flex-col gap-5">
                <ol className="flex flex-col gap-2 text-sm text-ink-2">
                    <li>{t('1. حمّل ملف المخزون الحالي (يفتح في Excel).')}</li>
                    <li>{t('2. عدّل عمود stock بالكمية المعدودة، وعمود cost بتكلفة القطعة. اترك الخانة فارغة لإبقاء القيمة كما هي.')}</li>
                    <li>{t('3. احفظه بصيغة CSV وارفعه هنا. كل فرق في الكمية يُسجل كتسوية جرد.')}</li>
                </ol>

                {warehouses?.length > 1 && (
                    <Field label={t('المخزن الذي تجرده')} hint={t('الملف المحمّل يحتوي على كميات هذا المخزن، والكميات المرفوعة تُطبق عليه.')}>
                        {(props) => <Select {...props} value={selectedWarehouse} onChange={(event) => setWarehouseId(event.target.value)} options={warehouses.map((warehouse) => ({ value: String(warehouse.warehouse_id), label: warehouse.name }))} className="sm:w-72" />}
                    </Field>
                )}

                <Button variant="secondary" icon="download" loading={exporting} onClick={exportStock} className="self-start">
                    {t('تحميل ملف المخزون')}
                </Button>

                {result ? (
                    <div className="flex flex-col gap-3">
                        <Alert tone={result.skipped ? 'warning' : 'success'} title={t('تم الاستيراد')}>
                            {t('تحديث {updated} صنف، {unchanged} بدون تغيير، {skipped} صف تم تخطيه.', { updated: formatNumber(result.updated), unchanged: formatNumber(result.unchanged), skipped: formatNumber(result.skipped) })}
                        </Alert>
                        {result.errors.length > 0 && (
                            <ul className="mk-scroll max-h-48 overflow-y-auto rounded-xl border border-line text-sm">
                                {result.errors.map((rowError) => (
                                    <li key={rowError.row} className="flex gap-3 border-b border-line px-3 py-2 last:border-0">
                                        <span className="shrink-0 text-muted">{t('صف {row}', { row: rowError.row })}</span>
                                        <span className="text-danger">{rowError.message}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={reset}>
                                {t('استيراد ملف آخر')}
                            </Button>
                            <Button onClick={close}>{t('تم')}</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DropZone accept=".csv,text/csv" maxSizeMb={5} file={file} onFile={pick} onClear={reset} onError={setError} title={t('اسحب ملف CSV هنا أو اضغط للاختيار')} description={t('ملف التصدير بعد تعديله، بحد أقصى {max} صف', { max: formatNumber(MAX_ROWS) })} />
                        {error && <Alert tone="danger">{error}</Alert>}
                        {rows && <p className="text-sm text-muted">{t('{count} صف جاهز للاستيراد.', { count: formatNumber(rows.length) })}</p>}
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={close} disabled={importing}>
                                {t('إلغاء')}
                            </Button>
                            <Button icon="upload" loading={importing} disabled={!rows} onClick={submit}>
                                {t('استيراد')}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
