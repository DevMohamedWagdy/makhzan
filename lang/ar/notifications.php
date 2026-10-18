<?php

return [

    'greeting' => 'مرحباً :name',
    'ignore_reset' => 'إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة ولن يتغير شيء.',
    'payout_requested' => [
        'message' => 'طلب :affiliate تحويل :amount ج.م من رصيد عمولاته',
        'subject' => 'طلب تحويل عمولة من :affiliate',
        'line' => 'طلب المسوق :affiliate تحويل :amount ج.م من رصيد عمولاته.',
        'note' => 'ملاحظة المسوق: :note',
        'action' => 'مراجعة الطلب',
        'outro' => 'بعد التحويل، سجّل الدفعة من ملف المسوق ليُخصم المبلغ من رصيده.',
    ],
    'affiliate_registered' => [
        'pending' => ':affiliate أرسل طلب انضمام لفريق المسوقين وينتظر موافقتك',
        'active' => 'انضم :affiliate لفريق المسوقين عبر رابط التسجيل',
        'subject' => 'مسوق جديد: :affiliate',
        'review' => 'مراجعة الطلب',
        'view' => 'عرض المسوق',
    ],
    'admin' => [
        'store_registered' => 'تاجر جديد سجّل متجر :store (:owner)',
        'subscription_requested' => 'طلب اشتراك جديد من :store في باقة :plan بقيمة :amount ج.م',
        'trial_ended' => 'انتهت الفترة التجريبية لمتجر :store دون اشتراك',
        'ticket_opened' => 'تذكرة دعم جديدة من :store: :subject',
        'ticket_vendor_replied' => 'رد جديد من :store على التذكرة: :subject',
    ],
    'subscription_activated' => [
        'subject' => 'تم تفعيل باقة :plan',
        'message' => 'تم تفعيل باقة :plan لمتجرك حتى :date. شكراً لثقتك في Sellygrow!',
    ],
    'subscription_rejected' => [
        'subject' => 'لم نتمكن من تفعيل باقة :plan',
        'message' => 'لم نتمكن من تأكيد الدفع لطلب تفعيل باقة :plan. راجع بيانات التحويل وأرسل الطلب مرة أخرى.',
    ],
    'subscription_expiring' => [
        'subject' => 'باقة :plan تنتهي قريباً',
        'message' => 'تنتهي باقة :plan لمتجرك في :date. جدّد اشتراكك حتى لا تتوقف مميزات الباقة.',
    ],
    'trial_ending' => [
        'subject' => 'الفترة التجريبية تنتهي قريباً',
        'message' => 'تنتهي الفترة التجريبية لمتجرك في :date. اختر باقة الآن حتى يستمر متجرك في استقبال الطلبات.',
    ],
    'subscription_note' => 'ملاحظة: :note',
    'subscription_action' => 'إدارة الاشتراك',
    'customer_order' => [
        'pending' => [
            'subject' => 'استلمنا طلبك #:number - :store',
            'line' => 'شكراً لطلبك من :store! استلمنا طلبك رقم #:number وسنراجعه ونؤكده قريباً.',
        ],
        'confirmed' => [
            'subject' => 'تم تأكيد طلبك #:number - :store',
            'line' => 'تم تأكيد طلبك رقم #:number وجارٍ تجهيزه للشحن.',
        ],
        'shipped' => [
            'subject' => 'طلبك #:number في الطريق إليك - :store',
            'line' => 'تم شحن طلبك رقم #:number وسيصلك قريباً.',
        ],
        'delivered' => [
            'subject' => 'تم توصيل طلبك #:number - :store',
            'line' => 'تم توصيل طلبك رقم #:number. نتمنى أن ينال إعجابك، وشكراً لثقتك في :store.',
        ],
        'cancelled' => [
            'subject' => 'تم إلغاء طلبك #:number - :store',
            'line' => 'نأسف لإبلاغك بأنه تم إلغاء طلبك رقم #:number.',
        ],
        'returned' => [
            'subject' => 'تم تسجيل إرجاع طلبك #:number - :store',
            'line' => 'تم تسجيل إرجاع طلبك رقم #:number. تواصل مع :store إذا كان لديك أي استفسار.',
        ],
        'tracking' => 'رقم التتبع لدى :carrier: :number',
        'tracking_link' => 'تابع شحنتك مباشرة: :url',
        'reason' => 'السبب: :reason',
        'item' => ':name × :quantity — :total ج.م',
        'total' => 'الإجمالي: :total ج.م',
        'cod_reminder' => 'برجاء تجهيز مبلغ :total ج.م للدفع عند الاستلام.',
        'action' => 'متابعة الطلب',
    ],
    'customer_reset_password' => [
        'subject' => 'إعادة تعيين كلمة المرور - :store',
        'intro' => 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك في :store.',
        'action' => 'تعيين كلمة مرور جديدة',
        'expiry' => 'ينتهي هذا الرابط خلال :minutes دقيقة ويمكن استخدامه مرة واحدة فقط.',
    ],
    'affiliate_reset_password' => [
        'subject' => 'إعادة تعيين كلمة المرور - :store',
        'intro' => 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك كمسوق في :store.',
        'action' => 'تعيين كلمة مرور جديدة',
        'expiry' => 'ينتهي هذا الرابط خلال :minutes دقيقة ويمكن استخدامه مرة واحدة فقط.',
    ],
    'vendor_reset_password' => [
        'subject' => 'إعادة تعيين كلمة المرور - Sellygrow',
        'intro' => 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك على Sellygrow.',
        'action' => 'إعادة تعيين كلمة المرور',
        'expiry' => 'ينتهي هذا الرابط خلال :minutes دقيقة.',
    ],
    'order_placed' => [
        'message' => 'طلب جديد #:number من :customer بقيمة :total ج.م',
        'message_paid' => 'طلب جديد مدفوع أونلاين #:number من :customer بقيمة :total ج.م',
        'subject' => 'طلب جديد #:number',
        'line' => 'وصلك طلب جديد #:number من :customer بقيمة :total ج.م.',
        'line_paid' => 'وصلك طلب جديد #:number من :customer بقيمة :total ج.م، ودفعه العميل أونلاين.',
        'action' => 'عرض الطلب',
    ],
    'late_payment' => [
        'message' => 'وصل دفع الطلب #:number (:total ج.م) بعد إلغائه، رجّع المبلغ للعميل',
        'subject' => 'دفع وصل لطلب ملغي #:number',
        'line' => 'دفع العميل :total ج.م للطلب #:number بعد إلغائه. افتح الطلب ورجّع المبلغ أو تواصل مع العميل.',
    ],
    'open_portal' => 'فتح بوابة المسوقين',
    'reason' => 'السبب: :reason',
    'store_note' => 'ملاحظة المتجر: :note',
    'account_approved' => [
        'subject' => 'تمت الموافقة على انضمامك لمسوقي :store',
        'message' => 'تمت الموافقة على طلب انضمامك لفريق مسوقي :store. روابط الإحالة الخاصة بك جاهزة للمشاركة.',
    ],
    'account_rejected' => [
        'subject' => 'بخصوص طلب انضمامك لمسوقي :store',
        'message' => 'نأسف، لم تتم الموافقة على طلب انضمامك لفريق مسوقي :store.',
    ],
    'account_frozen' => [
        'subject' => 'تم إيقاف حسابك كمسوق في :store',
        'message' => 'أوقف :store حسابك كمسوق مؤقتاً، وروابط الإحالة الخاصة بك معطلة حالياً. تواصل مع المتجر للاستفسار.',
    ],
    'account_reactivated' => [
        'subject' => 'تمت إعادة تفعيل حسابك في :store',
        'message' => 'أعاد :store تفعيل حسابك كمسوق، وروابط الإحالة الخاصة بك تعمل من جديد.',
    ],
    'payout_paid' => [
        'subject' => 'تم تحويل :amount ج.م إليك',
        'message' => 'حوّل المتجر :amount ج.م من عمولاتك إلى وسيلة السحب المسجلة.',
        'reference' => 'رقم العملية: :reference',
    ],
    'payout_rejected' => [
        'subject' => 'تم رفض طلب تحويل :amount ج.م',
        'message' => 'رفض المتجر طلب تحويل :amount ج.م، ورصيدك المستحق كما هو.',
    ],
    'referral_order_placed' => 'طلب جديد #:number عبر روابطك، عمولتك المتوقعة :commission ج.م عند التوصيل',
    'commission_earned' => 'تم توصيل الطلب #:number وأُضيفت :commission ج.م لرصيدك',
    'commission_cancelled' => 'أُلغي الطلب #:number، فلن تُحتسب عمولته (:commission ج.م)',
    'commission_reversed' => 'تم إرجاع الطلب #:number، فخُصمت عمولته (:commission ج.م) من رصيدك',
    'commission_changed' => [
        'percentage' => 'تم تحديث عمولتك إلى :value% من قيمة كل طلب جديد',
        'fixed' => 'تم تحديث عمولتك إلى :value ج.م على كل طلب جديد',
    ],
    'stock_out' => 'نفد مخزون :product',
    'stock_low' => 'مخزون :product منخفض: متبقي :stock فقط',
    'review_submitted' => 'تقييم جديد :rating/5 من :customer على :product بانتظار موافقتك',
    'coupon_assigned' => [
        'percentage' => 'أصبح لديك كود خصم :code بخصم :value% لعملائك',
        'fixed' => 'أصبح لديك كود خصم :code بخصم :value ج.م لعملائك',
        'free_shipping' => 'أصبح لديك كود خصم :code بشحن مجاني لعملائك',
        'subject' => 'كود خصم جديد خاص بك: :code',
        'line' => 'شاركه مع متابعيك؛ كل طلب يستخدمه يُحسب لك حتى بدون رابطك.',
    ],
    'ticket_replied' => [
        'subject' => 'رد جديد من فريق الدعم: :subject',
        'message' => 'رد فريق الدعم على تذكرتك ":subject".',
    ],
    'ticket_closed' => [
        'subject' => 'تم إغلاق تذكرتك: :subject',
        'message' => 'أغلق فريق الدعم تذكرتك ":subject". إن احتجت مساعدة أخرى افتح تذكرة جديدة.',
    ],
    'ticket_reopened' => [
        'subject' => 'تمت إعادة فتح تذكرتك: :subject',
        'message' => 'أعاد فريق الدعم فتح تذكرتك ":subject"، ويمكنك الرد عليها الآن.',
    ],
    'ticket_action' => 'عرض التذكرة',

    'open_dashboard' => 'فتح لوحة التحكم',
    'device' => ':browser على :system',
    'unknown_device' => 'جهاز غير معروف',
    'plan_resources' => [
        'products' => 'المنتجات',
        'staff' => 'الموظفين',
    ],
    'store_suspended' => [
        'subject' => 'تم إيقاف متجرك مؤقتاً',
        'message' => 'أوقفت إدارة المنصة متجرك مؤقتاً، فلن يظهر للعملاء ولن تستقبل طلبات حتى يُعاد تفعيله. السبب: :reason. تواصل مع الدعم الفني لمعرفة التفاصيل.',
    ],
    'store_reactivated' => [
        'subject' => 'عاد متجرك للعمل',
        'message' => 'أعادت إدارة المنصة تفعيل متجرك، وأصبح ظاهراً للعملاء ويستقبل الطلبات من جديد.',
    ],
    'plan_limit_near' => [
        'subject' => 'اقتربت من حد :resource في باقتك',
        'message' => 'استخدمت :used من :limit من حد :resource في باقتك الحالية. رقِّ باقتك قبل الوصول للحد حتى لا تتوقف الإضافة.',
    ],
    'plan_limit_reached' => [
        'subject' => 'وصلت لحد :resource في باقتك',
        'message' => 'وصلت لحد :resource في باقتك (:limit)، ولن تستطيع إضافة المزيد حتى ترقّي الباقة.',
    ],
    'coupon_used_up' => [
        'subject' => 'انتهت مرات استخدام الكوبون :code',
        'message' => 'استُخدم الكوبون :code كل المرات المسموح بها، ولم يعد يعمل في المتجر.',
    ],
    'coupon_expired' => [
        'subject' => 'انتهت مدة الكوبون :code',
        'message' => 'انتهت مدة الكوبون :code ولم يعد يعمل في المتجر.',
    ],
    'new_sign_in' => [
        'subject' => 'تسجيل دخول جديد لحسابك',
        'message' => 'تم تسجيل الدخول لحسابك من جهاز جديد (:device، IP :ip) في :time. إن لم تكن أنت، غيّر كلمة المرور فوراً.',
    ],
    'password_changed' => [
        'subject' => 'تم تغيير كلمة مرور حسابك',
        'message' => 'تم تغيير كلمة مرور حسابك من :device (IP :ip) في :time. إن لم تكن أنت، أعد تعيين كلمة المرور فوراً وتواصل مع الدعم الفني.',
    ],
];
