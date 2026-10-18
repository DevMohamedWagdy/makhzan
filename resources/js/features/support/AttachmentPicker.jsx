import { useId, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatFileSize } from '@/lib/format';
import { ATTACHMENT_EXTENSIONS, MAX_ATTACHMENT_MB, MAX_ATTACHMENTS } from './support';

const ACCEPT = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',');

/** Picks up to MAX_ATTACHMENTS files for a ticket message, checking type and size before upload. */
export function AttachmentPicker({ files, onChange, onError, disabled = false, className }) {
    const inputId = useId();
    const inputRef = useRef(null);

    const add = (picked) => {
        const accepted = [];

        for (const file of picked) {
            const extension = file.name.split('.').pop().toLowerCase();

            if (!ATTACHMENT_EXTENSIONS.includes(extension)) {
                onError?.(t('نوع الملف {name} غير مدعوم', { name: file.name }));
            } else if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
                onError?.(t('حجم الملف {name} يتجاوز {size} ميجابايت', { name: file.name, size: MAX_ATTACHMENT_MB }));
            } else {
                accepted.push(file);
            }
        }

        const next = [...files, ...accepted];

        if (next.length > MAX_ATTACHMENTS) {
            onError?.(t('يمكنك إرفاق {max} ملفات كحد أقصى في الرسالة الواحدة', { max: MAX_ATTACHMENTS }));
        }

        onChange(next.slice(0, MAX_ATTACHMENTS));
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                disabled={disabled || files.length >= MAX_ATTACHMENTS}
                onChange={(event) => {
                    add([...(event.target.files ?? [])]);
                    event.target.value = '';
                }}
            />
            <label
                htmlFor={inputId}
                className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-xs font-medium text-ink-2 transition hover:border-primary hover:text-primary',
                    (disabled || files.length >= MAX_ATTACHMENTS) && 'pointer-events-none opacity-55',
                )}
            >
                <Icon name="paperclip" className="size-4" />
                {t('إرفاق ملفات')}
            </label>
            {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-lg bg-surface-3 ps-2.5 pe-1 text-xs text-ink-2">
                    <Icon name={file.type.startsWith('image/') ? 'camera' : 'file-text'} className="size-3.5 shrink-0" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                    <span className="ltr shrink-0 text-muted">{formatFileSize(file.size)}</span>
                    <button
                        type="button"
                        onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-danger"
                        aria-label={t('إزالة {name}', { name: file.name })}
                    >
                        <Icon name="x" className="size-3.5" />
                    </button>
                </span>
            ))}
            {files.length === 0 && <span className="text-xs text-muted">{t('صور أو PDF أو مستندات، حتى {size} ميجابايت للملف', { size: MAX_ATTACHMENT_MB })}</span>}
        </div>
    );
}
