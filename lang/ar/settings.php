<?php

return [

    'url_invalid' => 'أدخل رابطاً صحيحاً يبدأ بـ https://',
    'store_closed' => 'المتجر متوقف عن استقبال الطلبات حالياً',
    'min_order_total' => 'أقل قيمة للطلب :amount ج.م، أضف منتجات بقيمة :remaining ج.م',
    'policy_not_found' => 'الصفحة غير موجودة',
    'policies' => [
        'returns' => 'سياسة الاسترجاع والاستبدال',
        'shipping' => 'سياسة الشحن والتوصيل',
        'privacy' => 'سياسة الخصوصية',
        'terms' => 'الشروط والأحكام',
    ],

    'domain_invalid' => 'الدومين غير صحيح. اكتبه بدون https، مثل: shop.example.com',
    'domain_taken' => 'هذا الدومين مربوط بمتجر آخر.',
    'domain_missing' => 'أضف الدومين أولاً.',
    'domain_not_pointing' => 'الدومين لا يشير إلينا بعد. أضف سجل CNAME يشير إلى :target ثم انتظر حتى ينتشر (قد يستغرق ساعة).',
    'store_suspended' => 'هذا المتجر متوقف مؤقتاً.',
    'vendor_suspended' => 'تم إيقاف متجرك من إدارة المنصة (:reason). تواصل مع الدعم لإعادة تفعيله.',

    'mail_test_subject' => 'رسالة تجريبية من :app',
    'mail_test_body' => 'إعدادات البريد في :app تعمل بشكل صحيح.',
    'mail_test_sent' => 'تم إرسال رسالة تجريبية إلى :email',
    'mail_test_logged' => 'المزود الحالي «سجل فقط»، لذلك لم تُرسل الرسالة فعلياً إلى :email، بل كُتبت في ملف storage/logs/laravel.log. اختر Amazon SES أو SMTP لإرسال حقيقي.',
    'mail_test_failed' => 'تعذر إرسال الرسالة: :error',
];
