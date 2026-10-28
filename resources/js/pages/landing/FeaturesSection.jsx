import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { Reveal, SectionHeading } from '@/pages/landing/Reveal';

/** The main features, each with a capture of its merchant dashboard screen (demo data) in public/images/landing/features. */
const FEATURES = [
    { key: 'orders', icon: 'shopping-bag', title: t('إدارة الطلبات'), text: t('كل طلباتك في شاشة واحدة من التأكيد حتى التسليم.') },
    { key: 'inventory', icon: 'warehouse', title: t('مخزون متعدد المخازن'), text: t('كميات كل مخزن لحظة بلحظة مع تنبيهات النقص.') },
    { key: 'storefront', icon: 'store', title: t('متجر إلكتروني جاهز'), text: t('متجر باسمك متصل بمخزونك مباشرة.') },
    { key: 'shipping', icon: 'truck', title: t('الشحن والتحصيل'), text: t('أسعار شحن لكل محافظة ومتابعة للتحصيل.') },
    { key: 'affiliates', icon: 'megaphone', title: t('برنامج المسوقين'), text: t('روابط إحالة وعمولات ولوحة لكل مسوق.') },
    { key: 'reports', icon: 'bar-chart', title: t('التقارير والأرباح'), text: t('مبيعاتك وأرباحك وأفضل منتجاتك بوضوح.') },
];

/** Smaller features, listed as labels under the showcase. */
const MORE_FEATURES = [t('دفع إلكتروني'), t('كوبونات وولاء'), t('المشتريات والموردين'), t('فريق وصلاحيات'), t('تقييمات المنتجات'), t('عربي وإنجليزي')];

/**
 * "Our features" as a showcase: the features listed on one side and a large capture of the selected one on the
 * other. The selection moves on by itself when the active item's progress bar fills (a CSS animation, so hovering
 * the list pauses it); a click picks a feature. Under reduced motion it stays put until clicked.
 */
export function FeaturesSection() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);

    useEffect(() => {
        setIsAutoPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, []);

    const advance = () => setActiveIndex((index) => (index + 1) % FEATURES.length);

    return (
        <section id="features" className="scroll-mt-20 border-b border-line bg-surface">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
                <SectionHeading
                    badge={t('مميزاتنا')}
                    title={
                        <>
                            {t('كل ما تحتاجه')} <span className="text-primary">{t('في لوحة واحدة')}</span>
                        </>
                    }
                    text={t('أدوات مترابطة من داخل لوحة تحكم التاجر توفر وقتك وتقلل الأخطاء.')}
                />

                <div className="mt-14 grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
                    <Reveal as="ul" className="group/list flex flex-col gap-2" aria-label={t('المميزات')}>
                        {FEATURES.map((feature, index) => {
                            const isActive = index === activeIndex;

                            return (
                                <li key={feature.key}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveIndex(index);
                                            setIsAutoPlaying(false);
                                        }}
                                        aria-pressed={isActive}
                                        className={cn(
                                            'relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-4 text-start transition-[background-color,border-color,box-shadow] duration-300',
                                            isActive ? 'border-line bg-surface shadow-raise' : 'border-transparent hover:bg-surface-2',
                                        )}
                                    >
                                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-300', isActive ? 'bg-primary text-white' : 'bg-surface-3 text-muted')}>
                                            <Icon name={feature.icon} className="size-5" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className={cn('block font-semibold transition-colors duration-300', isActive ? 'text-ink' : 'text-ink-2')}>{feature.title}</span>
                                            <span className={cn('grid transition-[grid-template-rows,opacity] duration-300', isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                                                <span className="overflow-hidden">
                                                    <span className="block pt-1 text-sm leading-relaxed text-muted">{feature.text}</span>
                                                </span>
                                            </span>
                                        </span>
                                        {isActive && isAutoPlaying && (
                                            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden="true">
                                                <span key={activeIndex} onAnimationEnd={advance} className="block h-full origin-[inline-start] animate-[mk-progress_6s_linear_forwards] bg-primary group-hover/list:[animation-play-state:paused]" />
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </Reveal>

                    {/* The capture leads on phones so it changes in view; from lg it sits beside the list. */}
                    <Reveal from="zoom" delay={150} className="order-first lg:order-none">
                        <div className="relative">
                            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-gold/10 to-transparent blur-2xl" aria-hidden="true" />
                            <figure className="overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_40px_80px_-40px_rgb(16_26_56/0.35)]">
                                <div className="flex items-center gap-1.5 px-2.5 py-2" dir="ltr" aria-hidden="true">
                                    <span className="size-2.5 rounded-full bg-danger/60" />
                                    <span className="size-2.5 rounded-full bg-warning/60" />
                                    <span className="size-2.5 rounded-full bg-success/60" />
                                </div>
                                <div className="relative aspect-[5/3] overflow-hidden rounded-xl border border-line bg-surface-2">
                                    {FEATURES.map((feature, index) => (
                                        <img
                                            key={feature.key}
                                            src={`/images/landing/features/${feature.key}.jpg`}
                                            alt={index === activeIndex ? t('شاشة {feature} في لوحة تحكم Sellygrow', { feature: feature.title }) : ''}
                                            aria-hidden={index !== activeIndex}
                                            width="1200"
                                            height="718"
                                            loading="lazy"
                                            decoding="async"
                                            className={cn('absolute inset-0 size-full object-cover object-top transition-[opacity,transform] duration-700 ease-out', index === activeIndex ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0')}
                                        />
                                    ))}
                                </div>
                            </figure>
                        </div>
                    </Reveal>
                </div>

                <Reveal className="mt-14 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-sm font-medium text-ink-2">{t('وأكثر:')}</span>
                    {MORE_FEATURES.map((feature) => (
                        <span key={feature} className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink-2">
                            <Icon name="check" className="size-3.5 text-primary" />
                            {feature}
                        </span>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
