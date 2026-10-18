import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { productsApi } from '@/services/productsApi';

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 4;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Product photos. For a saved product (`productId`) every change goes to the API at once;
 * for a new product the picked files are kept in `pendingFiles` and uploaded after saving.
 * The first image is the main one shown in the catalog. `readOnly` (no edit permission) only shows them.
 */
export function ProductImagesField({ productId, images, onImagesChange, pendingFiles, onPendingChange, readOnly = false }) {
    const toast = useToast();
    const inputRef = useRef(null);
    /** Index of a saved photo waiting for the merchant to confirm its deletion (it can't be undone). */
    const [confirmIndex, setConfirmIndex] = useState(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);

    const pendingPreviews = useMemo(() => pendingFiles.map((file, index) => ({ key: `${index}-${file.name}-${file.lastModified}-${file.size}`, url: URL.createObjectURL(file) })), [pendingFiles]);

    useEffect(() => () => pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [pendingPreviews]);

    const items = productId ? images.map((image) => ({ key: image.image_id, url: image.url })) : pendingPreviews;

    const run = async (action, errorTitle) => {
        setBusy(true);

        try {
            onImagesChange(await action());
        } catch (error) {
            toast.error(errorTitle, error.errors?.images ?? Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setBusy(false);
        }
    };

    const add = (fileList) => {
        const files = [...fileList];
        const invalid = files.find((file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE_MB * 1024 * 1024);

        if (invalid) {
            toast.error(t('تعذر إضافة الصورة'), t('{name}: استخدم PNG أو JPG أو WEBP بحد أقصى {MAX_SIZE_MB} ميجابايت', { name: invalid.name, MAX_SIZE_MB }));

            return;
        }

        if (items.length + files.length > MAX_IMAGES) {
            toast.error(t('تعذر إضافة الصور'), t('الحد الأقصى {MAX_IMAGES} صور للمنتج', { MAX_IMAGES }));

            return;
        }

        productId ? run(() => productsApi.uploadImages(productId, files), t('تعذر رفع الصور')) : onPendingChange([...pendingFiles, ...files]);
    };

    const remove = (index) =>
        productId ? run(async () => (await productsApi.removeImage(productId, images[index].image_id), images.filter((_, position) => position !== index)), t('تعذر حذف الصورة')) : onPendingChange(pendingFiles.filter((_, position) => position !== index));

    const move = (index, offset) => {
        const reorder = (list) => {
            const next = [...list];
            const [moved] = next.splice(index, 1);

            next.splice(index + offset, 0, moved);

            return next;
        };

        productId ? run(() => productsApi.reorderImages(productId, reorder(images).map((image) => image.image_id)), t('تعذر تغيير الترتيب')) : onPendingChange(reorder(pendingFiles));
    };

    return (
        <div className="flex flex-col gap-3">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
                {items.map((item, index) => (
                    <li key={item.key} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                        <img src={item.url} alt={t('صورة المنتج {value}', { value: index + 1 })} className="size-full object-cover" />
                        {index === 0 && <span className="absolute top-1.5 start-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{t('الرئيسية')}</span>}
                        {!readOnly && (
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-slate-950/60 p-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <div className="flex">
                                    <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="grid size-7 place-items-center rounded text-white hover:bg-white/20 disabled:opacity-30" aria-label={t('تقديم الصورة')} title={t('تقديم')}>
                                        <Icon name="chevron-right" className="size-4" />
                                    </button>
                                    <button type="button" onClick={() => move(index, 1)} disabled={busy || index === items.length - 1} className="grid size-7 place-items-center rounded text-white hover:bg-white/20 disabled:opacity-30" aria-label={t('تأخير الصورة')} title={t('تأخير')}>
                                        <Icon name="chevron-left" className="size-4" />
                                    </button>
                                </div>
                                <button type="button" onClick={() => (productId ? setConfirmIndex(index) : remove(index))} disabled={busy} className="grid size-7 place-items-center rounded text-white hover:bg-danger" aria-label={t('حذف الصورة')} title={t('حذف')}>
                                    <Icon name="trash" className="size-4" />
                                </button>
                            </div>
                        )}
                    </li>
                ))}
                {!readOnly && items.length < MAX_IMAGES && (
                    <li>
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);
                                add(event.dataTransfer.files);
                            }}
                            disabled={busy}
                            className={cn(
                                'grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed text-muted transition hover:border-primary hover:text-primary',
                                dragging ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface-2',
                            )}
                        >
                            <span className="flex flex-col items-center gap-1 text-xs font-medium">
                                {busy ? <Spinner className="size-5" /> : <Icon name="upload" className="size-5" />}
                                {t('إضافة صور')}
                            </span>
                        </button>
                    </li>
                )}
            </ul>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                className="sr-only"
                onChange={(event) => {
                    add(event.target.files);
                    event.target.value = '';
                }}
            />
            <ConfirmDialog
                open={confirmIndex !== null}
                onClose={() => setConfirmIndex(null)}
                onConfirm={() => {
                    remove(confirmIndex);
                    setConfirmIndex(null);
                }}
                icon="trash"
                title={t('حذف الصورة؟')}
                description={t('ستُحذف الصورة من المنتج والمتجر نهائياً.')}
                confirmLabel={t('حذف الصورة')}
            />
            <p className={cn('text-xs text-muted', readOnly && 'hidden')}>
                {t('حتى {MAX_IMAGES} صور، PNG أو JPG أو WEBP بحد أقصى {MAX_SIZE_MB} ميجابايت للصورة. الصورة الأولى هي الرئيسية.', { MAX_IMAGES, MAX_SIZE_MB })}
            </p>
        </div>
    );
}
