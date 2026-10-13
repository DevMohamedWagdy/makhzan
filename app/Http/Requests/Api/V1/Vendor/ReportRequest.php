<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReportRequest extends FormRequest
{
    /** Longest period one report may cover. */
    public const MAX_DAYS = 366;

    /** Period used when no dates are given: the last 30 days, today included. */
    public const DEFAULT_DAYS = 30;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d', 'required_with:to'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from', 'before_or_equal:'.CarbonImmutable::tomorrow()->toDateString()],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->filled(['from', 'to']) && ! $validator->errors()->any() && $this->periodStart()->diffInDays($this->periodEnd()) >= self::MAX_DAYS) {
                    $validator->errors()->add('from', __('orders.report_period_too_long', ['days' => self::MAX_DAYS]));
                }
            },
        ];
    }

    public function periodStart(): CarbonImmutable
    {
        return $this->filled('from') ? CarbonImmutable::parse($this->input('from')) : CarbonImmutable::today()->subDays(self::DEFAULT_DAYS - 1);
    }

    public function periodEnd(): CarbonImmutable
    {
        return $this->filled('to') ? CarbonImmutable::parse($this->input('to')) : CarbonImmutable::today();
    }
}
