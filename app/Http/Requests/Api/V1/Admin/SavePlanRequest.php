<?php

namespace App\Http\Requests\Api\V1\Admin;

use App\Enums\PlanFeature;
use App\Models\Plan;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SavePlanRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['slug' => Str::slug((string) ($this->input('slug') ?: $this->input('name')))]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Plan|null $plan */
        $plan = $this->route('plan');

        return [
            'name' => ['required', 'string', 'max:60'],
            'slug' => ['required', 'string', 'max:40', Rule::unique('plans', 'slug')->ignore($plan?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'price_monthly' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'price_yearly' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'max_products' => ['nullable', 'integer', 'min:0'],
            'max_staff' => ['nullable', 'integer', 'min:0'],
            'features' => ['present', 'array'],
            'features.*' => ['distinct', Rule::enum(PlanFeature::class)],
            'is_active' => ['boolean'],
            'position' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ];
    }
}
