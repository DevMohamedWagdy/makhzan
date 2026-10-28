<?php

return [

    'not_editable' => 'لا يمكن تعديل أمر شراء بعد استلام جزء منه',
    'cannot_receive' => 'لا يمكن الاستلام على أمر شراء مغلق أو ملغي',
    'cannot_cancel' => 'لا يمكن إلغاء أمر شراء بعد استلام جزء منه، أغلقه بدلاً من ذلك',
    'cannot_close' => 'يمكن إغلاق أمر الشراء المستلم جزئياً فقط',
    'cannot_order' => 'أمر الشراء ليس مسودة',
    'cannot_delete' => 'يمكن حذف المسودات فقط',
    'item_not_found' => 'الصنف غير موجود في أمر الشراء',
    'exceeds_remaining' => 'الكمية أكبر من المتبقي (:remaining)',
    'variant_deleted' => 'تم حذف هذا المنتج، ولا يمكن إضافته للمخزون',
    'nothing_to_receive' => 'أدخل كمية مستلمة لصنف واحد على الأقل',
    'receipt_note' => 'استلام أمر الشراء #:number',
    'supplier_required' => 'اختر المورد',
    'supplier_name_required' => 'أدخل اسم المورد',
    'supplier_has_orders' => 'لا يمكن حذف مورد له أوامر شراء',
    'items_required' => 'أضف صنفاً واحداً على الأقل',
    'items_distinct' => 'الصنف مكرر في أمر الشراء',
    'variant_invalid' => 'المنتج غير موجود',
    'quantity_min' => 'الكمية يجب أن تكون 1 على الأقل',
    'cost_required' => 'أدخل تكلفة القطعة',
    'not_found' => 'أمر الشراء غير موجود',
    'supplier_not_found' => 'المورد غير موجود',
    'import' => [
        'too_many_rows' => 'الحد الأقصى :max صف في الملف',
        'empty' => 'الملف لا يحتوي على صفوف',
        'not_found' => 'لم يتم العثور على المنتج (variant_id أو sku)',
        'ambiguous_sku' => 'رمز SKU مستخدم لأكثر من منتج، استخدم variant_id',
        'invalid_stock' => 'الكمية يجب أن تكون رقماً صحيحاً غير سالب',
        'invalid_cost' => 'التكلفة يجب أن تكون رقماً غير سالب',
        'note' => 'استيراد ملف المخزون',
    ],

    'statement_receipt' => 'استلام :units قطعة',
    'return_note' => 'مرتجع للمورد :supplier #:number',
    'return_exceeds_stock' => 'الكمية المرتجعة من «:product» أكبر من المتاح في المخزن',
    'payment_methods' => [
        'cash' => 'نقداً',
        'bank_transfer' => 'تحويل بنكي',
        'wallet' => 'محفظة إلكترونية',
        'cheque' => 'شيك',
        'other' => 'أخرى',
    ],

];
