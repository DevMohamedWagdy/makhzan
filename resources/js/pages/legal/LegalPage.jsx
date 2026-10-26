import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Skeleton } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/i18n';
import { APP_NAME } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { SiteFooter } from '@/pages/landing/SiteFooter';
import { BUILT_IN_DOCUMENTS, BUILT_IN_UPDATED_AT, parseLegalText } from '@/pages/legal/legalDocuments';
import { siteApi } from '@/services/siteApi';

/** The built-in document in the reader's language (its strings are Arabic source text). */
function builtInDocument(name) {
    const { intro, sections } = BUILT_IN_DOCUMENTS[name];

    return {
        intro: [t(intro)],
        sections: sections.map((section) => ({ title: t(section.title), paragraphs: section.paragraphs.map((paragraph) => t(paragraph)) })),
        updatedAt: BUILT_IN_UPDATED_AT,
    };
}

/** /terms and /privacy: the admin's text for the reader's language, or the built-in document. */
export function LegalPage({ document: name }) {
    const { isAuthenticated } = useAuth();
    const title = t(BUILT_IN_DOCUMENTS[name].title);
    const [legalDocument, setLegalDocument] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = `${title} | ${APP_NAME}`;
        setLegalDocument(null);

        let isCurrent = true;

        siteApi
            .legal(name)
            .then((result) => (result.content ? { ...parseLegalText(result.content), updatedAt: result.updated_at } : builtInDocument(name)))
            .catch(() => builtInDocument(name))
            .then((loaded) => isCurrent && setLegalDocument(loaded));

        return () => {
            isCurrent = false;
        };
    }, [name, title]);

    return (
        <div className="min-h-dvh bg-bg">
            <header className="border-b border-line bg-surface">
                <div className="mx-auto flex h-18 max-w-6xl items-center gap-4 px-4 sm:px-6">
                    <Link to="/" aria-label={t('الصفحة الرئيسية لـ Sellygrow')}>
                        <Logo className="h-4" />
                    </Link>
                    <div className="ms-auto flex items-center gap-2">
                        <LanguageToggle className="hidden sm:grid" />
                        <ThemeToggle />
                        <Button to={isAuthenticated ? '/dashboard' : '/'} variant="secondary">
                            {isAuthenticated ? t('لوحة التحكم') : t('الصفحة الرئيسية')}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
                <nav aria-label={t('الصفحات القانونية')} className="mb-8 flex gap-2">
                    {Object.entries(BUILT_IN_DOCUMENTS).map(([key, item]) => (
                        <Link key={key} to={`/${key}`} aria-current={key === name ? 'page' : undefined} className={key === name ? 'rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary' : 'rounded-lg px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-3'}>
                            {t(item.title)}
                        </Link>
                    ))}
                </nav>

                <article className="mk-card p-6 sm:p-10" aria-busy={!legalDocument}>
                    <h1 className="mk-page-title">{title}</h1>
                    {legalDocument ? (
                        <>
                            {legalDocument.updatedAt && <p className="mt-2 text-sm text-muted">{t('آخر تحديث: {date}', { date: formatDate(legalDocument.updatedAt) })}</p>}
                            {legalDocument.intro.map((paragraph) => (
                                <p key={paragraph} className="mt-6 leading-loose text-ink-2">
                                    {paragraph}
                                </p>
                            ))}

                            {legalDocument.sections.map((section, index) => (
                                <section key={`${index}-${section.title}`} className="mt-8">
                                    <h2 className="text-lg font-semibold text-ink">
                                        {index + 1}. {section.title}
                                    </h2>
                                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                                        <p key={paragraphIndex} className="mt-3 leading-loose text-ink-2">
                                            {paragraph}
                                        </p>
                                    ))}
                                </section>
                            ))}
                        </>
                    ) : (
                        <div className="mt-6 flex flex-col gap-3">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    )}
                </article>
            </main>

            <SiteFooter />
        </div>
    );
}
