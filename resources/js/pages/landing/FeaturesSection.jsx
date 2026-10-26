import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';

/** The main features, each with a capture of its merchant dashboard screen (demo data) in public/images/landing/features. */
const FEATURES = [
    { key: 'orders', icon: 'shopping-bag', title: t('إدارة الطلبات'), text: t('كل طلباتك في شاشة واحدة من التأكيد حتى التسليم.') },
    { key: 'inventory', icon: 'warehouse', title: t('مخزون متعدد المخازن'), text: t('كميات كل مخزن لحظة بلحظة مع تنبيهات النقص.') },
    { key: 'storefront', icon: 'store', title: t('متجر إلكتروني جاهز'), text: t('متجر باسمك متصل بمخزونك مباشرة.') },
    { key: 'shipping', icon: 'truck', title: t('الشحن والتحصيل'), text: t('أسعار شحن لكل محافظة ومتابعة للتحصيل.') },
    { key: 'affiliates', icon: 'megaphone', title: t('برنامج المسوقين'), text: t('روابط إحالة وعمولات ولوحة لكل مسوق.') },
    { key: 'reports', icon: 'bar-chart', title: t('التقارير والأرباح'), text: t('مبيعاتك وأرباحك وأفضل منتجاتك بوضوح.') },
];

/** Smaller features, listed as labels under the cards. */
const MORE_FEATURES = [t('دفع إلكتروني'), t('كوبونات وولاء'), t('المشتريات والموردين'), t('فريق وصلاحيات'), t('تقييمات المنتجات'), t('عربي وإنجليزي')];

/** "Our features": six cards with a glimpse of each dashboard screen, then the smaller features as labels. */
export function FeaturesSection() {
    return (
        <section id="features" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-[30px] leading-tight font-bold text-ink sm:text-[40px]">
                    {t('كل ما تحتاجه')} <span className="text-primary">{t('في لوحة واحدة')}</span>
                </h2>
                <p className="mt-3 leading-relaxed text-muted sm:text-lg">{t('أدوات مترابطة من داخل لوحة تحكم التاجر توفر وقتك وتقلل الأخطاء.')}</p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature) => (
                    <article key={feature.key} className="group overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-raise">
                        <div className="aspect-[5/3] overflow-hidden border-b border-line bg-surface-2">
                            <img
                                src={`/images/landing/features/${feature.key}.jpg`}
                                alt={t('شاشة {feature} في لوحة تحكم Sellygrow', { feature: feature.title })}
                                width="1200"
                                height="718"
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                            />
                        </div>
                        <div className="flex items-start gap-3 p-5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                                <Icon name={feature.icon} className="size-[18px]" />
                            </span>
                            <span>
                                <span className="block font-semibold text-ink">{feature.title}</span>
                                <span className="mt-0.5 block text-sm text-muted">{feature.text}</span>
                            </span>
                        </div>
                    </article>
                ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm font-medium text-ink-2">{t('وأكثر:')}</span>
                {MORE_FEATURES.map((feature) => (
                    <span key={feature} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2">
                        {feature}
                    </span>
                ))}
            </div>
        </section>
    );
}
