import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar } from '@/components/ui/Display';
import { Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { cn, formatDate, formatFileSize, formatTime } from '@/lib/format';
import { AttachmentPicker } from './AttachmentPicker';

/** Saves a Blob under its original name. */
function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** An image attachment loads its private file into a thumbnail that opens full size. */
function ImageAttachment({ attachment, load }) {
    const [url, setUrl] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl = null;
        let cancelled = false;

        load(attachment.attachment_id)
            .then((blob) => {
                if (!cancelled) {
                    objectUrl = URL.createObjectURL(blob);
                    setUrl(objectUrl);
                }
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [attachment.attachment_id, load]);

    if (failed) {
        return <FileAttachment attachment={attachment} load={load} />;
    }

    return (
        <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block size-28 overflow-hidden rounded-lg border border-line bg-surface-3" title={attachment.name}>
            {url ? <img src={url} alt={attachment.name} className="size-full object-cover" /> : <span className="block size-full animate-pulse" />}
        </a>
    );
}

function FileAttachment({ attachment, load }) {
    const toast = useToast();
    const [downloading, setDownloading] = useState(false);

    const download = async () => {
        setDownloading(true);

        try {
            saveBlob(await load(attachment.attachment_id), attachment.name);
        } catch (error) {
            toast.error(t('تعذر تحميل الملف'), error.message);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="flex max-w-[260px] items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-start transition hover:border-primary disabled:opacity-60"
        >
            <Icon name={downloading ? 'refresh' : 'file-text'} className={cn('size-5 shrink-0 text-primary', downloading && 'animate-spin')} />
            <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-ink">{attachment.name}</span>
                <span className="ltr block text-start text-[11px] text-muted">{formatFileSize(attachment.size)}</span>
            </span>
            <Icon name="download" className="size-4 shrink-0 text-muted" />
        </button>
    );
}

function Message({ message, own, load }) {
    const fromTeam = message.author_type === 'admin';

    return (
        <li className={cn('flex gap-3', own && 'flex-row-reverse')}>
            <Avatar name={message.author_name ?? '?'} size="sm" className="mt-1 shrink-0" />
            <div className={cn('flex max-w-[min(640px,85%)] flex-col gap-1.5', own && 'items-end')}>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="font-semibold text-ink-2">{message.author_name ?? t('حساب محذوف')}</span>
                    {fromTeam && <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">{t('فريق الدعم')}</span>}
                    <span>
                        {formatDate(message.created_at)} · {formatTime(message.created_at)}
                    </span>
                </p>
                {message.body && (
                    <div className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap', own ? 'rounded-se-sm bg-primary text-white' : 'rounded-ss-sm border border-line bg-surface-2 text-ink')}>{message.body}</div>
                )}
                {message.attachments?.length > 0 && (
                    <div className={cn('flex flex-wrap items-start gap-2', own && 'justify-end')}>
                        {message.attachments.map((attachment) =>
                            attachment.is_image ? <ImageAttachment key={attachment.attachment_id} attachment={attachment} load={load} /> : <FileAttachment key={attachment.attachment_id} attachment={attachment} load={load} />,
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}

/**
 * A ticket's conversation and reply box, shared by the merchant's dashboard and the admin
 * panel. `viewer` ('vendor' | 'admin') puts that side's messages on the start edge.
 */
export function TicketThread({ ticket, viewer, loadAttachment, onReply, canReply, closedNotice }) {
    const toast = useToast();
    const [body, setBody] = useState('');
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);
    const messageCount = ticket.messages?.length ?? 0;
    const closed = ticket.status === 'closed';

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest' });
    }, [messageCount]);

    const send = async (event) => {
        event?.preventDefault();

        if (!body.trim() && files.length === 0) {
            setError(t('اكتب رداً أو أرفق ملفاً'));

            return;
        }

        setSending(true);
        setError(null);

        try {
            await onReply({ body: body.trim() || undefined, attachments: files.length ? files : undefined });
            setBody('');
            setFiles([]);
        } catch (replyError) {
            setError(Object.values(replyError.errors ?? {})[0] ?? replyError.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="mk-card overflow-hidden">
            <ol className="flex flex-col gap-5 p-4 sm:p-6">
                {ticket.messages?.map((message) => <Message key={message.message_id} message={message} own={message.author_type === viewer} load={loadAttachment} />)}
                <li ref={endRef} aria-hidden="true" />
            </ol>

            <div className="border-t border-line bg-surface-2/60 p-4 sm:p-5">
                {closed ? (
                    closedNotice ?? <Alert tone="info" icon="lock">{t('هذه التذكرة مغلقة.')}</Alert>
                ) : canReply ? (
                    <form onSubmit={send} className="flex flex-col gap-3">
                        <Textarea
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                    send(event);
                                }
                            }}
                            placeholder={t('اكتب ردك هنا…')}
                            maxLength={5000}
                            rows={3}
                            aria-label={t('الرد')}
                        />
                        {error && (
                            <p className="flex items-center gap-1 text-xs text-danger">
                                <Icon name="alert-circle" className="size-3.5" />
                                {error}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <AttachmentPicker files={files} onChange={setFiles} onError={(message) => toast.error(t('تعذر إرفاق الملف'), message)} disabled={sending} />
                            <Button type="submit" icon="send" loading={sending}>
                                {t('إرسال الرد')}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <p className="text-center text-sm text-muted">{t('ليس لديك صلاحية الرد على التذاكر.')}</p>
                )}
            </div>
        </section>
    );
}
