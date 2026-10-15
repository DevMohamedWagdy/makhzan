import { t } from '@/i18n';

/** Dashboard sections and their actions, mirroring App\Support\StorePermissions::CATALOG. */
export const PERMISSION_SECTIONS = {
    orders: { label: t('الطلبات'), icon: 'shopping-bag' },
    products: { label: t('المنتجات والأقسام'), icon: 'box' },
    inventory: { label: t('المخزون'), icon: 'warehouse' },
    purchasing: { label: t('المشتريات'), icon: 'download' },
    customers: { label: t('العملاء'), icon: 'user' },
    reviews: { label: t('تقييمات المنتجات'), icon: 'star' },
    marketing: { label: t('التسويق'), icon: 'megaphone' },
    payments: { label: t('المدفوعات'), icon: 'credit-card' },
    reports: { label: t('التقارير'), icon: 'bar-chart' },
    settings: { label: t('إعدادات المتجر والشحن'), icon: 'settings' },
};

export const PERMISSION_ACTIONS = {
    view: t('عرض'),
    create: t('إضافة'),
    update: t('تعديل'),
    delete: t('حذف'),
    ship: t('الشحن مع بوسطة'),
    transfer: t('التحويل بين المخازن'),
    warehouses: t('إدارة المخازن'),
    payouts: t('تحويلات العمولة'),
    impersonate: t('الدخول كمسوق'),
    refund: t('استرداد المبالغ'),
    settings: t('إعدادات الدفع'),
};

/** Ready-made roles to start from. */
export const ROLE_TEMPLATES = [
    { name: t('خدمة العملاء'), description: t('يتابع الطلبات ويغيّر حالتها ويرى العملاء'), permissions: ['orders.view', 'orders.create', 'orders.update', 'customers.view', 'reviews.view', 'reviews.update'] },
    { name: t('موظف مخزن'), description: t('يجهّز ويشحن الطلبات ويعدّل الكميات'), permissions: ['orders.view', 'orders.update', 'orders.ship', 'inventory.view', 'inventory.update', 'inventory.transfer'] },
    { name: t('مدير منتجات'), description: t('يضيف ويعدّل المنتجات والأقسام والمخزون'), permissions: ['products.view', 'products.create', 'products.update', 'products.delete', 'inventory.view', 'inventory.update'] },
    { name: t('مسوّق'), description: t('يدير الكوبونات والمسوقين ويرى التقارير'), permissions: ['marketing.view', 'marketing.create', 'marketing.update', 'reports.view'] },
    { name: t('محاسب'), description: t('يرى المدفوعات والتقارير ويسترد المبالغ'), permissions: ['orders.view', 'payments.view', 'payments.refund', 'reports.view'] },
];
