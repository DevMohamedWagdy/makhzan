/** Stroke icon set (24×24, 1.8 stroke). Inline to avoid an icon-font dependency. */
const PATHS = {
    'alert-circle': <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>,
    'alert-triangle': <><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    'arrow-left': <path d="M19 12H5m6-6-6 6 6 6" />,
    'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
    'bar-chart': <path d="M4 20V10m6 10V4m6 16v-7m4 7H3" />,
    'bell': <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
    'box': <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
    'building': <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" /></>,
    'camera': <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></>,
    'check': <path d="m5 12.5 4.5 4.5L19 7.5" />,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-left': <path d="m15 6-6 6 6 6" />,
    'chevron-right': <path d="m9 6 6 6-6 6" />,
    'copy': <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>,
    'download': <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M4 19h16" />,
    'edit': <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    'eye': <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.2 3.2M6.6 6.6A16.5 16.5 0 0 0 2.5 12s3.5 7 9.5 7a9.3 9.3 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>,
    'file-spreadsheet': <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6M8 13h8M8 17h8M12 11v8" /></>,
    'filter': <path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5Z" />,
    'gift': <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
    'grid': <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    'info': <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    'link': <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
    'lock': <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    'log-in': <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />,
    'log-out': <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m7 14 5-5-5-5m5 5H9" />,
    'mail': <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></>,
    'map-pin': <><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    'megaphone': <><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></>,
    'menu': <path d="M4 6h16M4 12h16M4 18h16" />,
    'moon': <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
    'more-vertical': <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
    'percent': <><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
    'phone': <path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
    'plus': <path d="M12 5v14M5 12h14" />,
    'refresh': <path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4m-4 5a8 8 0 0 0 14.8 4M20 20v-4h-4" />,
    'search': <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    'send': <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />,
    'settings': <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    'shield-check': <><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    'shopping-bag': <><path d="M5 7h14l-1 13H6L5 7Z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></>,
    'snowflake': <path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5M9 4l3 2 3-2M9 20l3-2 3 2" />,
    'sparkles': <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2" />,
    'store': <><path d="M4 10v10h16V10M3 4h18l-1.5 6H4.5L3 4Z" /><path d="M9 20v-5h6v5" /></>,
    'sun': <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    'trash': <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    'truck': <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></>,
    'upload': <path d="M12 16V5m-4.5 4.5L12 5l4.5 4.5M4 19h16" />,
    'upload-cloud': <><path d="M7 18a5 5 0 0 1-.9-9.9A6 6 0 0 1 17.7 9 4.5 4.5 0 0 1 17 18" /><path d="M12 12v8m-3-5 3-3 3 3" /></>,
    'user': <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    'user-plus': <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M19 8v6m3-3h-6" /></>,
    'users': <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3" /></>,
    'wallet': <><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 13.5h2" /></>,
    'warehouse': <><path d="M3 21V8l9-5 9 5v13" /><path d="M7 21v-8h10v8M7 17h10" /></>,
    'x': <path d="M6 6l12 12M18 6 6 18" />,
    'zap': <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
};

/** @param {{ name: keyof typeof PATHS, className?: string, strokeWidth?: number }} props */
export function Icon({ name, className = 'size-5', strokeWidth = 1.8, ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            {...props}
        >
            {PATHS[name] ?? PATHS.info}
        </svg>
    );
}
