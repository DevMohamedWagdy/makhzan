<?php

return [

    'method_unavailable' => 'طريقة الدفع هذه غير متاحة في المتجر حالياً',
    'cannot_pay' => 'لا يمكن دفع هذا الطلب الآن',
    'start_failed' => 'تعذر فتح صفحة الدفع، حاول مرة أخرى أو اختر الدفع عند الاستلام',
    'awaiting_payment' => 'لا يمكن تأكيد الطلب قبل أن يدفعه العميل',
    'expired' => 'لم يكتمل الدفع في الوقت المحدد',
    'paymob_item' => 'طلب #:number',

    'nothing_to_refund' => 'لا يوجد مبلغ مدفوع أونلاين يمكن استرداده لهذا الطلب',
    'refund_too_much' => 'أقصى مبلغ يمكن استرداده :amount ج.م',
    'refund_amount_required' => 'أدخل المبلغ المراد استرداده',
    'refund_failed' => 'رفضت Paymob الاسترداد، راجع حسابك على Paymob وحاول مرة أخرى',
    'gateway_disconnected' => 'اربط حساب Paymob مرة أخرى لتتمكن من الاسترداد',

    'secret_key_required' => 'أدخل الـ Secret Key',
    'public_key_required' => 'أدخل الـ Public Key',
    'hmac_secret_required' => 'أدخل الـ HMAC Secret',
    'integration_required' => 'أدخل Integration ID لطريقة دفع واحدة على الأقل',
    'integration_id_invalid' => 'الـ Integration ID أرقام فقط',
    'keys_mode_mismatch' => 'المفتاحان ليسا من نفس الوضع: أحدهما تجريبي (test) والآخر حقيقي (live)',
    'no_method_enabled' => 'فعّل طريقة دفع واحدة على الأقل لتستقبل الطلبات',
    'paymob_unreachable' => 'تعذر الاتصال بـ Paymob الآن، حاول بعد قليل',
    'paymob_secret_invalid' => 'الـ Secret Key غير صحيح',
    'paymob_integration_invalid' => 'الـ Integration ID غير صحيح، أو غير مفعّل، أو من وضع مختلف عن المفاتيح (test/live)',

];
