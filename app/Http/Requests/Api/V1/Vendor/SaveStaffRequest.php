<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Models\Vendor;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds a staff member (password required) or edits one (password optional, to reset it).
 */
class SaveStaffRequest extends FormRequest
{
    /**
     * Another store's staff (or any owner) is reported as missing before validating.
     */
    public function authorize(): bool
    {
        $staffMember = $this->route('staffMember');

        abort_if($staffMember && $staffMember->store_id !== $this->user()->store->id, Response::HTTP_NOT_FOUND);

        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => PhoneNumber::normalize($this->input('phone')),
            'email' => Str::lower(trim((string) $this->input('email'))),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Vendor|null $staffMember */
        $staffMember = $this->route('staffMember');

        return [
            'full_name' => ['required', 'string', 'min:3', 'max:255'],
            'job_title' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'regex:'.PhoneNumber::PATTERN, Rule::unique('vendors', 'phone')->ignore($staffMember?->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('vendors', 'email')->ignore($staffMember?->id)],
            'password' => [$staffMember ? 'nullable' : 'required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/'],
            'role_id' => ['required', 'integer', Rule::exists('store_roles', 'id')->where('store_id', $this->user()->store->id)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => __('forms.full_name_required'),
            'job_title.required' => __('forms.job_title_required'),
            'job_title.max' => __('forms.job_title_max'),
            'phone.required' => __('forms.vendor_phone_required'),
            'phone.regex' => __('forms.phone_invalid'),
            'phone.unique' => __('forms.phone_taken'),
            'email.required' => __('forms.email_required'),
            'email.email' => __('forms.email_invalid'),
            'email.unique' => __('forms.email_taken'),
            'password.required' => __('forms.password_required'),
            'password.min' => __('forms.password_rules'),
            'password.regex' => __('forms.password_rules'),
            'role_id.required' => __('forms.role_required'),
            'role_id.exists' => __('forms.role_required'),
        ];
    }
}
