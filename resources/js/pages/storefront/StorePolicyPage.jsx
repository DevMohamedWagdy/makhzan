import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { storefrontApi } from '@/services/storefrontApi';

/** One of the store's policy pages (returns, shipping, privacy, terms), as plain text. */
export function StorePolicyPage() {
    const { storeSlug, policy } = useParams();
    const { store } = useStorefront();
    const [page, setPage] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        setPage(null);
        setMissing(false);
        storefrontApi
            .policy(storeSlug, policy)
            .then(setPage)
            .catch(() => setMissing(true));
    }, [storeSlug, policy]);

    useEffect(() => {
        if (page && store) {
            document.title = `${page.title} | ${store.name}`;
        }
    }, [page, store]);

    if (missing) {
        return <EmptyState icon="info" title={t('الصفحة غير موجودة')} action={<Link to={`/${storeSlug}`} className="text-sm font-medium text-primary hover:underline">{t('العودة للمتجر')}</Link>} />;
    }

    if (!page) {
        return <Skeleton className="mx-auto h-64 max-w-3xl rounded-2xl" />;
    }

    return (
        <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h1 className="mk-page-title">{page.title}</h1>
            <div className="mt-4 text-sm leading-loose whitespace-pre-line text-ink-2">{page.body}</div>
        </article>
    );
}
