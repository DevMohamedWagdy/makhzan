<?php

return [

    'not_found' => 'الطلب غير موجود',
    'sign_in_required' => 'سجّل الدخول لحسابك في المتجر للمتابعة',
    'customer_phone_taken' => 'هذا الرقم مسجل بالفعل، سجّل الدخول بدلاً من إنشاء حساب جديد',
    'customer_email_taken' => 'هذا البريد مسجل بالفعل لحساب آخر',
    'recipient_required' => 'أدخل اسم المستلم',
    'address_line_required' => 'أدخل العنوان بالتفصيل (الشارع ورقم العقار)',
    'address_not_found' => 'العنوان غير موجود',
    'customer_not_found' => 'العميل غير موجود',
    'report_period_too_long' => 'أقصى مدة للتقرير :days يوماً',
    'cart_empty' => 'السلة فارغة',
    'item_unavailable' => 'هذا المنتج لم يعد متاحاً',
    'item_insufficient' => 'متبقي :available قطعة فقط من هذا المنتج',
    'no_delivery' => 'المتجر لا يوصّل إلى هذه المحافظة حالياً',
    'invalid_transition' => 'لا يمكن نقل الطلب إلى هذه الحالة',
    'cannot_cancel' => 'لا يمكن إلغاء الطلب بعد تأكيده من المتجر، تواصل مع المتجر',
    'price_invalid' => 'أدخل سعراً صحيحاً',

    'sources' => [
        'store' => 'المتجر الإلكتروني',
        'whatsapp' => 'واتساب',
        'messenger' => 'ماسنجر',
        'instagram' => 'إنستجرام',
        'phone' => 'مكالمة هاتفية',
        'walkin' => 'من المحل',
        'other' => 'أخرى',
    ],
    'manual' => [
        'recorded_from' => 'سُجل يدوياً · :source',
        'source_required' => 'اختر مصدر الطلب',
        'items_required' => 'أضف منتجاً واحداً على الأقل',
        'discount_too_high' => 'الخصم أكبر من إجمالي المنتجات',
    ],

    'carriers' => [
        'bosta' => 'بوسطة',
    ],
    'shipping' => [
        'bosta_not_connected' => 'اربط حساب بوسطة أولاً من صفحة الشحن.',
        'must_be_confirmed' => 'أكّد الطلب أولاً قبل شحنه.',
        'already_shipped' => 'هذا الطلب له شحنة بالفعل.',
        'bosta_failed' => 'رفضت بوسطة إنشاء الشحنة: :reason',
        'bosta_key_invalid' => 'مفتاح API غير صحيح. انسخه من لوحة بوسطة (الإعدادات ← API Integration).',
        'no_bosta_orders' => 'لا توجد شحنات بوسطة ضمن الطلبات المختارة.',
        'updated_by_bosta' => 'تحديث تلقائي من بوسطة',
    ],
];
