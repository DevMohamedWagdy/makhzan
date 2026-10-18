import { t } from '@/i18n';

/** Groups of the role editor, in the sidebar's order. */
export const PERMISSION_GROUPS = [
    { key: 'home', label: t('الرئيسية') },
    { key: 'sales', label: t('المبيعات') },
    { key: 'catalog', label: t('الكتالوج') },
    { key: 'stock', label: t('المخزون والمشتريات') },
    { key: 'marketing', label: t('التسويق') },
    { key: 'admin', label: t('الإدارة') },
];

/**
 * One entry per dashboard feature, mirroring App\Support\StorePermissions::CATALOG and
 * labelled like the sidebar, so the owner sees exactly which pages a role opens.
 */
export const PERMISSION_SECTIONS = {
    dashboard: { label: t('لوحة التحكم'), icon: 'nav-dashboard', group: 'home', hint: t('الأرقام المعروضة تتبع صلاحيات الأقسام الأخرى') },
    notifications: { label: t('الإشعارات'), icon: 'nav-notifications', group: 'home', hint: t('يرى إشعارات الأقسام المسموح له بها فقط') },
    orders: { label: t('الطلبات'), icon: 'nav-orders', group: 'sales' },
    payments: { label: t('المدفوعات'), icon: 'nav-payments', group: 'sales' },
    customers: { label: t('العملاء'), icon: 'nav-customers', group: 'sales' },
    reviews: { label: t('التقييمات'), icon: 'nav-reviews', group: 'sales' },
    shipping: { label: t('الشحن'), icon: 'nav-shipping', group: 'sales' },
    products: { label: t('المنتجات'), icon: 'nav-products', group: 'catalog' },
    categories: { label: t('الأقسام'), icon: 'nav-categories', group: 'catalog' },
    collections: { label: t('التصنيفات'), icon: 'nav-collections', group: 'catalog' },
    inventory: { label: t('المخزون'), icon: 'nav-inventory', group: 'stock' },
    warehouses: { label: t('المخازن'), icon: 'nav-warehouses', group: 'stock' },
    purchasing: { label: t('أوامر الشراء'), icon: 'nav-purchase-orders', group: 'stock' },
    suppliers: { label: t('الموردين'), icon: 'nav-suppliers', group: 'stock' },
    affiliates: { label: t('المسوقين'), icon: 'nav-affiliates', group: 'marketing' },
    payouts: { label: t('طلبات التحويل'), icon: 'nav-payouts', group: 'marketing' },
    coupons: { label: t('الكوبونات'), icon: 'nav-coupons', group: 'marketing' },
    loyalty: { label: t('برنامج النقاط'), icon: 'nav-loyalty', group: 'marketing' },
    reports: { label: t('التقارير'), icon: 'nav-reports', group: 'admin' },
    activity: { label: t('سجل النشاط'), icon: 'nav-activity', group: 'admin' },
    settings: { label: t('إعدادات المتجر'), icon: 'nav-settings', group: 'admin' },
    support: { label: t('الدعم الفني'), icon: 'message-square', group: 'admin' },
};

export const PERMISSION_ACTIONS = {
    view: t('عرض'),
    create: t('إضافة'),
    update: t('تعديل'),
    delete: t('حذف'),
    ship: t('الشحن مع بوسطة'),
    transfer: t('التحويل بين المخازن'),
    impersonate: t('الدخول كمسوق'),
    refund: t('استرداد المبالغ'),
    settings: t('إعدادات الدفع'),
};

/** Ready-made roles to start from. */
export const ROLE_TEMPLATES = [
    { name: t('خدمة العملاء'), description: t('يتابع الطلبات ويغيّر حالتها ويرى العملاء'), permissions: ['dashboard.view', 'notifications.view', 'orders.view', 'orders.create', 'orders.update', 'customers.view', 'reviews.view', 'reviews.update', 'support.view', 'support.create'] },
    { name: t('موظف مخزن'), description: t('يجهّز ويشحن الطلبات ويعدّل الكميات'), permissions: ['dashboard.view', 'notifications.view', 'orders.view', 'orders.update', 'orders.ship', 'inventory.view', 'inventory.update', 'inventory.transfer', 'warehouses.view'] },
    { name: t('مدير منتجات'), description: t('يضيف ويعدّل المنتجات والأقسام والتصنيفات والمخزون'), permissions: ['dashboard.view', 'notifications.view', 'products.view', 'products.create', 'products.update', 'products.delete', 'categories.view', 'categories.create', 'categories.update', 'categories.delete', 'collections.view', 'collections.create', 'collections.update', 'collections.delete', 'inventory.view', 'inventory.update', 'warehouses.view'] },
    { name: t('مسوّق'), description: t('يدير المسوقين والكوبونات وبرنامج النقاط ويرى التقارير'), permissions: ['dashboard.view', 'notifications.view', 'affiliates.view', 'affiliates.create', 'affiliates.update', 'payouts.view', 'coupons.view', 'coupons.create', 'coupons.update', 'coupons.delete', 'loyalty.view', 'loyalty.update', 'reports.view'] },
    { name: t('محاسب'), description: t('يرى المدفوعات والتقارير ويسترد المبالغ ويحوّل العمولات'), permissions: ['dashboard.view', 'notifications.view', 'orders.view', 'payments.view', 'payments.refund', 'payouts.view', 'payouts.update', 'reports.view'] },
];
