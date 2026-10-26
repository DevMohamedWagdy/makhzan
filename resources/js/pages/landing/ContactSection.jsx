import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { siteApi } from '@/services/siteApi';

const EMPTY_FORM = { full_name: '', phone: '', email: '', message: '', website: '' };

/**
 * "Contact us" on the landing page: the channels the admin set (WhatsApp, email) on a navy card, beside a
 * form whose messages land in the admin panel's contact inbox. A hidden "website" field catches bots.
 */
export function ContactSection() {
    const [contact, setContact] = useState(null);
    const [values, setValues] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const [sentMessage, setSentMessage] = useState(null);
    const [failure, setFailure] = useState(null);

    useEffect(() => {
        siteApi
            .contact()
            .then(setContact)
            .catch(() => setContact(null));
    }, []);

    const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setErrors({});
        setFailure(null);
        setSending(true);

        try {
            const result = await siteApi.sendMessage(values);

            setSentMessage(result.message);
            setValues(EMPTY_FORM);
        } catch (error) {
            const fieldErrors = error.errors ?? {};

            setErrors(fieldErrors);
            // Rate limits and server errors carry no field errors: say what happened under the form.
            setFailure(Object.keys(fieldErrors).length ? null : error.status === 429 ? t('أرسلت رسائل كثيرة في وقت قصير، حاول مرة أخرى بعد دقيقة.') : error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <section id="contact" className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-line bg-surface shadow-raise lg:grid-cols-[0.85fr_1.15fr]">
                <div className="relative overflow-hidden bg-brand p-8 text-white sm:p-10">
                    <div className="mk-grid-texture absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden="true" />
                    <div className="absolute -end-24 -bottom-24 size-72 rounded-full bg-brand-accent/30 blur-3xl" aria-hidden="true" />
                    <div className="relative">
                        <span className="mk-overline text-gold">{t('تواصل معنا')}</span>
                        <h2 className="mt-3 text-[28px] leading-snug font-bold sm:text-[34px]">{t('عندك سؤال؟ فريقنا جاهز يساعدك')}</h2>
                        <p className="mt-4 leading-relaxed text-panel-text">{t('اكتب رسالتك وسنرد عليك في أقرب وقت، أو تواصل معنا مباشرة.')}</p>

                        {(contact?.whatsapp || contact?.contact_email) && (
                            <ul className="mt-8 flex flex-col gap-3">
                                {contact.whatsapp && (
                                    <li>
                                        <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]">
                                            <span className="grid size-10 place-items-center rounded-xl bg-[#25D366] text-white">
                                                <Icon name="phone" className="size-5" />
                                            </span>
                                            <span>
                                                <span className="block text-xs text-panel-muted">{t('واتساب')}</span>
                                                <span className="ltr mk-num block font-semibold">+{contact.whatsapp}</span>
                                            </span>
                                        </a>
                                    </li>
                                )}
                                {contact.contact_email && (
                                    <li>
                                        <a href={`mailto:${contact.contact_email}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]">
                                            <span className="grid size-10 place-items-center rounded-xl bg-gold text-brand">
                                                <Icon name="mail" className="size-5" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-xs text-panel-muted">{t('البريد الإلكتروني')}</span>
                                                <span className="ltr block truncate font-semibold">{contact.contact_email}</span>
                                            </span>
                                        </a>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="p-6 sm:p-10">
                    {sentMessage ? (
                        <div className="flex h-full flex-col items-center justify-center py-10 text-center" role="status">
                            <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success">
                                <Icon name="check" className="size-8" strokeWidth={2.4} />
                            </span>
                            <h3 className="mt-5 text-xl font-semibold text-ink">{t('تم إرسال رسالتك')}</h3>
                            <p className="mt-2 max-w-sm text-muted">{sentMessage}</p>
                            <Button variant="secondary" className="mt-6" onClick={() => setSentMessage(null)}>
                                {t('إرسال رسالة أخرى')}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={t('الاسم بالكامل')} error={errors.full_name} required>
                                    {(props) => <Input {...props} value={values.full_name} onChange={set('full_name')} autoComplete="name" placeholder={t('اكتب اسمك')} />}
                                </Field>
                                <Field label={t('رقم الهاتف')} error={errors.phone} required>
                                    {(props) => <Input {...props} type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" className="text-start" placeholder="01012345678" />}
                                </Field>
                            </div>
                            <Field label={t('البريد الإلكتروني')} error={errors.email} required>
                                {(props) => <Input {...props} type="email" value={values.email} onChange={set('email')} autoComplete="email" dir="ltr" className="text-start" placeholder="you@example.com" />}
                            </Field>
                            <Field label={t('الرسالة')} error={errors.message} required>
                                {(props) => <Textarea {...props} rows={5} value={values.message} onChange={set('message')} placeholder={t('كيف يمكننا مساعدتك؟')} />}
                            </Field>
                            {/* Honeypot: hidden from people, filled by bots; the API drops those messages. */}
                            <input type="text" name="website" value={values.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -start-[9999px] size-px opacity-0" />
                            {failure && <p className="text-sm text-danger">{failure}</p>}
                            <Button type="submit" size="lg" icon="send" loading={sending} className="sm:self-start">
                                {t('إرسال الرسالة')}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
