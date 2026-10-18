import { t } from '@/i18n';

/** Mirrors App\Enums\SupportTicketType. */
export const TICKET_TYPES = {
    problem: { label: t('مشكلة'), tone: 'danger', icon: 'alert-circle', description: t('شيء لا يعمل كما يجب في متجرك أو لوحة التحكم') },
    suggestion: { label: t('اقتراح'), tone: 'info', icon: 'sparkles', description: t('فكرة أو ميزة تتمنى أن نضيفها إلى Sellygrow') },
};

/** Mirrors App\Enums\SupportTicketStatus. */
export const TICKET_STATUSES = {
    open: { label: t('مفتوحة'), tone: 'success' },
    closed: { label: t('مغلقة'), tone: 'neutral' },
};

/** Mirrors config('makhzan.support'). */
export const ATTACHMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_MB = 5;
