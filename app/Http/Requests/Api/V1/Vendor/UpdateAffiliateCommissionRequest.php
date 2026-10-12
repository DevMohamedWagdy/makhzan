<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\CommissionType;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAffiliateCommissionRequest extends FormRequest
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
        $customRequired = Rule::requiredIf(fn (): bool => ! $this->boolean('use_tier_default'));

        return [
            'use_tier_default' => ['required', 'boolean'],
            'type' => [$customRequired, 'nullable', Rule::enum(CommissionType::class)],
            'value' => [$customRequired, 'nullable', 'numeric'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * The allowed value range depends on the commission type.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->boolean('use_tier_default') || $validator->errors()->hasAny(['type', 'value'])) {
                    return;
                }

                $type = CommissionType::from($this->input('type'));
                [$min, $max] = $type->limits();
                $value = (float) $this->input('value');

                if ($value < $min || $value > $max) {
                    $validator->errors()->add('value', $type === CommissionType::Percentage
                        ? __('affiliates.commission_percentage_range', ['min' => $min, 'max' => $max])
                        : __('affiliates.commission_fixed_range', ['min' => $min, 'max' => $max]));
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
            'type.required' => __('affiliates.commission_type_required'),
            'type.enum' => __('affiliates.commission_type_unknown'),
            'value.required' => __('affiliates.commission_value_required'),
            'value.numeric' => __('affiliates.commission_value_numeric'),
        ];
    }
}
