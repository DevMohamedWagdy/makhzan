<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAffiliateStatusRequest extends FormRequest
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
            'status' => ['required', Rule::in([AffiliateStatus::Active->value, AffiliateStatus::Frozen->value])],
            'reason' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * Pending applicants are approved (activated) or rejected (deleted), never frozen.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Affiliate $affiliate */
                $affiliate = $this->route('affiliate');

                if ($this->input('status') === AffiliateStatus::Frozen->value && $affiliate->status === AffiliateStatus::Pending) {
                    $validator->errors()->add('status', __('affiliates.cannot_freeze_pending'));
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
            'status.required' => __('affiliates.status_required'),
            'status.in' => __('affiliates.status_invalid'),
            'reason.max' => __('affiliates.freeze_reason_max'),
        ];
    }
}
