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
    'affiliate_reset_password' => [
        'subject' => 'إعادة تعيين كلمة المرور - :store',
        'intro' => 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك كمسوق في :store.',
        'action' => 'تعيين كلمة مرور جديدة',
        'expiry' => 'ينتهي هذا الرابط خلال :minutes دقيقة ويمكن استخدامه مرة واحدة فقط.',
    ],
    'vendor_reset_password' => [
        'subject' => 'إعادة تعيين كلمة المرور - مخزن',
        'intro' => 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك على مخزن.',
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
    'coupon_assigned' => [
        'percentage' => 'أصبح لديك كود خصم :code بخصم :value% لعملائك',
        'fixed' => 'أصبح لديك كود خصم :code بخصم :value ج.م لعملائك',
        'free_shipping' => 'أصبح لديك كود خصم :code بشحن مجاني لعملائك',
        'subject' => 'كود خصم جديد خاص بك: :code',
        'line' => 'شاركه مع متابعيك؛ كل طلب يستخدمه يُحسب لك حتى بدون رابطك.',
    ],

];
