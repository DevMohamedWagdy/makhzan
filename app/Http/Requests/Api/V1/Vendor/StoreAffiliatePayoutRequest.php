<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class StoreAffiliatePayoutRequest extends FormRequest
{
    /**
     * Another store's affiliate is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('affiliate'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'reference' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:200'],
            'paid_at' => ['nullable', 'date', 'before_or_equal:now'],
        ];
    }

    /**
     * Applicants awaiting approval have nothing to be paid yet.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->route('affiliate')->status === AffiliateStatus::Pending) {
                    $validator->errors()->add('amount', 'لا يمكن تسجيل دفعة لمسوق لم تتم الموافقة عليه بعد');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'أدخل المبلغ المحوّل',
            'amount.numeric' => 'المبلغ يجب أن يكون رقماً',
            'amount.min' => 'أقل مبلغ للتحويل 1 ج.م',
            'paid_at.before_or_equal' => 'تاريخ التحويل لا يمكن أن يكون في المستقبل',
        ];
    }
}
