<?php

/*
|--------------------------------------------------------------------------
| Validation Language Lines (Arabic)
|--------------------------------------------------------------------------
|
| Generic messages for rules without a custom message in a form request.
| Rules missing here fall back to lang/en/validation.php.
|
*/

return [

    'accepted' => 'يجب قبول :attribute.',
    'after' => 'يجب أن يكون :attribute تاريخاً بعد :date.',
    'after_or_equal' => 'يجب أن يكون :attribute تاريخاً بعد أو يساوي :date.',
    'alpha' => 'يجب أن يحتوي :attribute على حروف فقط.',
    'alpha_dash' => 'يجب أن يحتوي :attribute على حروف وأرقام وشرطات فقط.',
    'alpha_num' => 'يجب أن يحتوي :attribute على حروف وأرقام فقط.',
    'array' => 'يجب أن يكون :attribute مصفوفة.',
    'before' => 'يجب أن يكون :attribute تاريخاً قبل :date.',
    'before_or_equal' => 'يجب أن يكون :attribute تاريخاً قبل أو يساوي :date.',
    'between' => [
        'array' => 'يجب أن يحتوي :attribute على عدد عناصر بين :min و :max.',
        'file' => 'يجب أن يكون حجم :attribute بين :min و :max كيلوبايت.',
        'numeric' => 'يجب أن تكون قيمة :attribute بين :min و :max.',
        'string' => 'يجب أن يكون طول :attribute بين :min و :max حرفاً.',
    ],
    'boolean' => 'يجب أن تكون قيمة :attribute صحيحة أو خاطئة.',
    'confirmed' => 'تأكيد :attribute غير متطابق.',
    'current_password' => 'كلمة المرور غير صحيحة.',
    'date' => ':attribute ليس تاريخاً صحيحاً.',
    'different' => 'يجب أن يكون :attribute مختلفاً عن :other.',
    'digits' => 'يجب أن يتكون :attribute من :digits أرقام.',
    'digits_between' => 'يجب أن يتكون :attribute من :min إلى :max أرقام.',
    'distinct' => ':attribute مكرر.',
    'email' => 'صيغة :attribute غير صحيحة.',
    'enum' => 'قيمة :attribute غير صالحة.',
    'exists' => ':attribute المحدد غير موجود.',
    'file' => 'يجب أن يكون :attribute ملفاً.',
    'filled' => 'يجب إدخال :attribute.',
    'gt' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أكبر من :value.',
        'string' => 'يجب أن يكون طول :attribute أكبر من :value حرفاً.',
    ],
    'gte' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أكبر من أو تساوي :value.',
    ],
    'image' => 'يجب أن يكون :attribute صورة.',
    'in' => 'قيمة :attribute غير صالحة.',
    'integer' => 'يجب أن يكون :attribute عدداً صحيحاً.',
    'json' => 'يجب أن يكون :attribute نصاً بصيغة JSON.',
    'lt' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أقل من :value.',
    ],
    'lte' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أقل من أو تساوي :value.',
    ],
    'max' => [
        'array' => 'يجب ألا يحتوي :attribute على أكثر من :max عناصر.',
        'file' => 'يجب ألا يتجاوز حجم :attribute :max كيلوبايت.',
        'numeric' => 'يجب ألا تتجاوز قيمة :attribute :max.',
        'string' => 'يجب ألا يتجاوز طول :attribute :max حرفاً.',
    ],
    'mimes' => 'يجب أن يكون :attribute ملفاً من نوع: :values.',
    'mimetypes' => 'يجب أن يكون :attribute ملفاً من نوع: :values.',
    'min' => [
        'array' => 'يجب أن يحتوي :attribute على :min عناصر على الأقل.',
        'file' => 'يجب ألا يقل حجم :attribute عن :min كيلوبايت.',
        'numeric' => 'يجب ألا تقل قيمة :attribute عن :min.',
        'string' => 'يجب ألا يقل طول :attribute عن :min حروف.',
    ],
    'not_in' => 'قيمة :attribute غير صالحة.',
    'numeric' => 'يجب أن يكون :attribute رقماً.',
    'present' => 'يجب إرسال :attribute.',
    'regex' => 'صيغة :attribute غير صحيحة.',
    'required' => ':attribute مطلوب.',
    'required_if' => ':attribute مطلوب عندما يكون :other هو :value.',
    'required_unless' => ':attribute مطلوب ما لم يكن :other ضمن :values.',
    'required_with' => ':attribute مطلوب عند وجود :values.',
    'required_without' => ':attribute مطلوب عند عدم وجود :values.',
    'same' => 'يجب أن يتطابق :attribute مع :other.',
    'size' => [
        'array' => 'يجب أن يحتوي :attribute على :size عناصر.',
        'numeric' => 'يجب أن تكون قيمة :attribute مساوية لـ :size.',
        'string' => 'يجب أن يكون طول :attribute :size حرفاً.',
    ],
    'string' => 'يجب أن يكون :attribute نصاً.',
    'unique' => ':attribute مستخدم من قبل.',
    'uploaded' => 'تعذّر رفع الملف، ربما حجمه أكبر من المسموح. جرّب ملفاً أصغر.',
    'url' => 'صيغة :attribute غير صحيحة.',

    'custom' => [],

    'attributes' => [
        'name' => 'الاسم',
        'full_name' => 'الاسم',
        'email' => 'البريد الإلكتروني',
        'phone' => 'رقم الهاتف',
        'message' => 'الرسالة',
        'password' => 'كلمة المرور',
        'description' => 'الوصف',
        'note' => 'الملاحظة',
        'reference' => 'رقم العملية',
        'amount' => 'المبلغ',
        'status' => 'الحالة',
        'image' => 'الصورة',
        'images' => 'الصور',
        'search' => 'البحث',
        'per_page' => 'عدد النتائج',
    ],

];
