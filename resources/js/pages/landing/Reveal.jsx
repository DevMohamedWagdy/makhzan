import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';

/**
 * Fades and lifts its children in (a CSS transition) the first time they scroll into view; `from="zoom"` tips them
 * up in 3D instead. `delay` (ms) staggers siblings; the global reduced-motion rule makes the entrance instant.
 * Keep hover transitions on a child element: this one's transition belongs to the entrance.
 */
export function Reveal({ as: Tag = 'div', from = 'up', delay = 0, className, style, children, ...props }) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -10% 0px' },
        );

        observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    return (
        <Tag ref={ref} data-from={from} className={cn('mk-reveal', isVisible && 'is-visible', className)} style={{ transitionDelay: `${delay}ms`, ...style }} {...props}>
            {children}
        </Tag>
    );
}

/**
 * A section's intro: a pill badge with an accent dot, the title and an optional lead. Centered by default,
 * `align="start"` for a side column; `inverse` for dark bands.
 */
export function SectionHeading({ badge, title, text, align = 'center', inverse = false }) {
    return (
        <Reveal className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'mx-auto text-center lg:mx-0 lg:text-start')}>
            <span
                className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium',
                    inverse ? 'border-white/15 bg-white/[0.04] text-white/80' : 'border-gold/30 bg-gold/10 text-ink-2',
                )}
            >
                <span className="size-1.5 rounded-full bg-gold" />
                {badge}
            </span>
            <h2 className={cn('mt-5 text-[30px] leading-tight font-bold sm:text-[42px]', inverse ? 'text-white' : 'text-ink')}>{title}</h2>
            {text && <p className={cn('mt-4 text-base leading-relaxed sm:text-lg', inverse ? 'text-white/65' : 'text-muted')}>{text}</p>}
        </Reveal>
    );
}
