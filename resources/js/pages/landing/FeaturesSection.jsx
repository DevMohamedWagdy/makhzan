import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { Reveal, SectionHeading } from '@/pages/landing/Reveal';

/** The main features, each with a capture of its merchant dashboard screen (demo data) in public/images/landing/features. */
const FEATURES = [
    {
        key: 'orders',
        icon: 'shopping-bag',
        title: t('إدارة الطلبات'),
        text: t('تابع كل طلب من لحظة وصوله حتى التسليم أو الاسترجاع من شاشة واحدة.'),
        points: [t('طلبات يدوية من واتساب والمكالمات بجانب طلبات المتجر'), t('طباعة الطلبات وتجهيزها للشحن'), t('رقم تتبع للشحنة يظهر لعميلك')],
    },
    {
        key: 'inventory',
        icon: 'warehouse',
        title: t('مخزون متعدد المخازن'),
        text: t('اعرف كمية كل منتج في كل مخزن لحظة بلحظة، مع سجل كامل لكل حركة.'),
        points: [t('تنبيهات تلقائية للمخزون المنخفض والنافد'), t('تحديث الكميات والتكلفة دفعة واحدة من ملف CSV'), t('تقارير قيمة المخزون والبضاعة الراكدة')],
    },
    {
        key: 'storefront',
        icon: 'store',
        title: t('متجر إلكتروني جاهز'),
        text: t('متجر باسمك وعلى دومينك، متصل بمخزونك فلا تبيع ما ليس عندك.'),
        points: [t('دفع بالبطاقة والمحافظ الإلكترونية أو عند الاستلام'), t('حسابات للعملاء مع المفضلة وتتبع الطلبات'), t('ربط بكسل ميتا وتيك توك وجوجل أناليتكس')],
    },
    {
        key: 'shipping',
        icon: 'truck',
        title: t('الشحن والتحصيل'),
        text: t('حدد أسعار الشحن لكل محافظة وتابع المبالغ المحصّلة من كل طلب.'),
        points: [t('أسعار شحن مختلفة لكل محافظة'), t('متابعة المدفوعات والمبالغ المستردة'), t('نسبة المرتجعات لكل محافظة لتعرف أين تخسر')],
    },
    {
        key: 'affiliates',
        icon: 'megaphone',
        title: t('برنامج المسوقين'),
        text: t('حوّل عملاءك ومتابعيك إلى فريق تسويق يبيع لك مقابل عمولة.'),
        points: [t('رابط إحالة ولوحة تحكم خاصة لكل مسوق'), t('مستويات وعمولات تُحسب تلقائياً مع كل طلب'), t('مراجعة طلبات تحويل العمولات من مكان واحد')],
    },
    {
        key: 'reports',
        icon: 'bar-chart',
        title: t('التقارير والأرباح'),
        text: t('أرقام واضحة تخبرك أين تربح وأين تحتاج إلى التحرك.'),
        points: [t('صافي الربح بعد التكلفة والخصومات والعمولات'), t('أكثر المنتجات مبيعاً وأعلاها ربحاً'), t('توقع نفاد المخزون قبل أن يحدث')],
    },
];

/** Everything else in the dashboard, grouped by area for the grid under the showcase. */
const CAPABILITY_GROUPS = [
    {
        icon: 'users',
        title: t('المبيعات والعملاء'),
        items: [t('ملف لكل عميل بسجل طلباته'), t('تقييمات المنتجات ومراجعتها'), t('إشعار للعميل بكل تحديث في طلبه'), t('إشعارات فورية بكل طلب جديد')],
    },
    {
        icon: 'box',
        title: t('الكتالوج'),
        items: [t('منتجات بمقاسات وألوان وأسعار مختلفة'), t('أقسام وتصنيفات لترتيب متجرك'), t('اسم ووصف لكل منتج بالعربي والإنجليزي'), t('حالات للمنتج: منشور ومسودة ومؤرشف')],
    },
    {
        icon: 'file-text',
        title: t('المشتريات والموردين'),
        items: [t('أوامر شراء واستلام البضاعة للمخزن'), t('كشف حساب ومدفوعات لكل مورد'), t('مرتجعات المشتريات'), t('اقتراحات ذكية لإعادة الطلب قبل النفاد')],
    },
    {
        icon: 'gift',
        title: t('التسويق والولاء'),
        items: [t('كوبونات خصم بحدود وشروط'), t('برنامج نقاط يكافئ عملاءك المتكررين'), t('مسوقين بالعمولة وروابط إحالة'), t('بكسل التتبع لقياس إعلاناتك')],
    },
    {
        icon: 'shield-check',
        title: t('فريقك وأمان متجرك'),
        items: [t('حسابات لفريقك بصلاحيات لكل قسم'), t('سجل نشاط لكل عملية في المتجر'), t('دعم فني من داخل لوحة التحكم'), t('واجهة عربية وإنجليزية مع وضع ليلي')],
    },
    {
        icon: 'sparkles',
        title: t('متجرك الإلكتروني'),
        items: [t('رابط خاص أو دومين باسمك'), t('سلة ودفع إلكتروني آمن'), t('صفحات السياسات والشروط جاهزة'), t('تصميم سريع يعمل على كل الأجهزة')],
    },
];

/**
 * "Our features": a showcase (the features listed on one side and a large capture of the selected one on the other),
 * then the rest of the dashboard grouped by area. The selection moves on by itself when the active item's progress bar
 * fills (a CSS animation, so hovering the list pauses it); a click picks a feature. Under reduced motion it stays put
 * until clicked.
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
                    <Reveal as="ul" className="group/list flex flex-col gap-2" aria-label={t('المميزات الرئيسية')}>
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
                                                    <span className="mt-3 flex flex-col gap-1.5">
                                                        {feature.points.map((point) => (
                                                            <span key={point} className="flex items-start gap-2 text-sm text-ink-2">
                                                                <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-primary" />
                                                                {point}
                                                            </span>
                                                        ))}
                                                    </span>
                                                </span>
                                            </span>
                                        </span>
                                        {isActive && isAutoPlaying && (
                                            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden="true">
                                                <span key={activeIndex} onAnimationEnd={advance} className="block h-full origin-[inline-start] animate-[mk-progress_7s_linear_forwards] bg-primary group-hover/list:[animation-play-state:paused]" />
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

                <CapabilityGrid />
            </div>
        </section>
    );
}

/** The rest of the dashboard, one card per area with what it covers. */
function CapabilityGrid() {
    return (
        <div className="mt-24 sm:mt-28">
            <Reveal className="mx-auto max-w-2xl text-center">
                <h3 className="text-2xl font-bold text-ink sm:text-3xl">{t('وأكثر من ذلك بكثير')}</h3>
                <p className="mt-3 leading-relaxed text-muted">{t('كل أداة تحتاجها لإدارة تجارتك موجودة بالفعل داخل لوحة التحكم، بدون إضافات أو اشتراكات منفصلة.')}</p>
            </Reveal>

            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITY_GROUPS.map((group, index) => (
                    <Reveal as="li" key={group.title} delay={(index % 3) * 90}>
                        <article className="group h-full rounded-2xl border border-line bg-surface-2 p-6 transition-[translate,border-color,background-color,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-surface hover:shadow-raise">
                            <div className="flex items-center gap-3">
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/15 ring-inset transition-transform duration-500 ease-out group-hover:-rotate-6">
                                    <Icon name={group.icon} className="size-5" />
                                </span>
                                <h4 className="text-lg font-semibold text-ink">{group.title}</h4>
                            </div>
                            <ul className="mt-5 flex flex-col gap-2.5">
                                {group.items.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-2">
                                        <Icon name="check" className="mt-1 size-3.5 shrink-0 text-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </Reveal>
                ))}
            </ul>
        </div>
    );
}
