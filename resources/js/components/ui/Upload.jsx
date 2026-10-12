import { useId, useRef, useState } from 'react';
import { useObjectUrl } from '@/hooks/common';
import { cn, formatFileSize } from '@/lib/format';
import { Icon } from './Icon';

function validateFile(file, { accept, maxSizeMb }) {
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    const accepted = accept.split(',').map((type) => type.trim());
    const typeOk = accepted.some((type) => type === extension || type === file.type || (type.endsWith('/*') && file.type.startsWith(type.slice(0, -1))));

    if (!typeOk) {
        return 'نوع الملف غير مدعوم';
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
        return `حجم الملف يتجاوز ${maxSizeMb} ميجابايت`;
    }

    return null;
}

function useDropTarget(onFile) {
    const [dragging, setDragging] = useState(false);

    return {
        dragging,
        handlers: {
            onDragOver: (event) => {
                event.preventDefault();
                setDragging(true);
            },
            onDragLeave: () => setDragging(false),
            onDrop: (event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];

                if (file) {
                    onFile(file);
                }
            },
        },
    };
}

/** Square image picker with preview (store logo, affiliate avatar). */
export function ImageUpload({ value, onChange, onError, label = 'رفع صورة', hint, maxSizeMb = 2, shape = 'rounded', accept = 'image/png,image/jpeg,image/webp' }) {
    const inputId = useId();
    const inputRef = useRef(null);
    const preview = useObjectUrl(value);

    const pick = (file) => {
        const error = validateFile(file, { accept, maxSizeMb });

        if (error) {
            onError?.(error);

            return;
        }

        onError?.(null);
        onChange(file);
    };

    const { dragging, handlers } = useDropTarget(pick);

    return (
        <div className="flex items-center gap-4">
            <label
                htmlFor={inputId}
                {...handlers}
                className={cn(
                    'group relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden border-2 border-dashed transition',
                    shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
                    dragging ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface-2 hover:border-primary',
                )}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="" className="size-full object-cover" />
                        <span className="absolute inset-0 grid place-items-center bg-slate-950/50 text-white opacity-0 transition group-hover:opacity-100">
                            <Icon name="camera" />
                        </span>
                    </>
                ) : (
                    <Icon name="camera" className="size-7 text-muted transition group-hover:text-primary" />
                )}
            </label>
            <input ref={inputRef} id={inputId} type="file" accept={accept} className="sr-only" onChange={(event) => event.target.files?.[0] && pick(event.target.files[0])} />
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => inputRef.current?.click()} className="text-sm font-semibold text-primary hover:underline">
                        {preview ? 'تغيير الصورة' : label}
                    </button>
                    {preview && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null);
                                inputRef.current.value = '';
                            }}
                            className="text-sm text-danger hover:underline"
                        >
                            إزالة
                        </button>
                    )}
                </div>
                <p className="text-xs leading-relaxed text-muted">{hint ?? `PNG أو JPG أو WEBP، بحد أقصى ${maxSizeMb} ميجابايت`}</p>
                {value instanceof File && <p className="ltr text-xs text-ink-2">{value.name}</p>}
            </div>
        </div>
    );
}

/** Generic file drop zone (bulk import). */
export function DropZone({ accept, maxSizeMb = 5, onFile, onError, title, description, file, onClear }) {
    const inputRef = useRef(null);

    const pick = (picked) => {
        const error = validateFile(picked, { accept, maxSizeMb });

        if (error) {
            onError?.(error);

            return;
        }

        onError?.(null);
        onFile(picked);
    };

    const { dragging, handlers } = useDropTarget(pick);

    if (file) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-4">
                <span className="grid size-11 place-items-center rounded-xl bg-success-soft text-success">
                    <Icon name="file-spreadsheet" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="ltr truncate text-start text-sm font-semibold text-ink">{file.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        onClear();
                        if (inputRef.current) {
                            inputRef.current.value = '';
                        }
                    }}
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label="إزالة الملف"
                    title="إزالة الملف"
                >
                    <Icon name="trash" className="size-[18px]" />
                </button>
            </div>
        );
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), inputRef.current?.click())}
            {...handlers}
            className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none',
                dragging ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface-2 hover:border-primary',
            )}
        >
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="upload-cloud" className="size-7" />
            </span>
            <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-xs text-muted">{description}</p>
            </div>
            <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(event) => event.target.files?.[0] && pick(event.target.files[0])} />
        </div>
    );
}
