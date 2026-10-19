<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use App\Models\Affiliate;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAffiliateRequest extends FormRequest
{
    /**
     * Normalize the phone and email before the per-store uniqueness checks.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => PhoneNumber::normalize($this->input('phone')),
            'email' => mb_strtolower(trim((string) $this->input('email'))),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:5', 'max:255'],
            'phone' => [
                'required', 'regex:'.PhoneNumber::PATTERN,
                Rule::unique('affiliates', 'phone')
                    ->where('store_id', $this->targetStore()->id)
                    ->ignore($this->editedAffiliate()?->id),
            ],
            // Affiliates sign in with their email, so it's required and unique within the store.
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('affiliates', 'email')
                    ->where('store_id', $this->targetStore()->id)
                    ->ignore($this->editedAffiliate()?->id),
            ],
            'password' => [$this->passwordPresence(), 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'tier' => ['required', Rule::enum(AffiliateTier::class)],
            'payout_method' => ['required', 'array:type,account_name,account_number,bank_name,iban'],
            'payout_method.type' => ['required', Rule::enum(PayoutMethod::class)],
            'payout_method.account_name' => ['required', 'string', 'max:255'],
            'payout_method.account_number' => ['required', 'string', 'max:64'],
            'payout_method.bank_name' => ['nullable', 'string', 'max:255', 'required_if:payout_method.type,'.PayoutMethod::BankAccount->value],
            'payout_method.iban' => ['nullable', 'string', 'max:34'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => __('affiliates.full_name_required'),
            'full_name.min' => __('forms.full_name_min'),
            'phone.required' => __('affiliates.phone_required'),
            'phone.regex' => __('forms.phone_invalid'),
            'phone.unique' => __('affiliates.phone_taken'),
            'email.required' => __('affiliates.email_required'),
            'email.email' => __('forms.email_invalid'),
            'email.unique' => __('affiliates.email_taken'),
            'password.required' => __('affiliates.password_required'),
            'password.min' => __('forms.password_rules'),
            'password.regex' => __('forms.password_rules'),
            'password.confirmed' => __('forms.password_mismatch'),
            'avatar.image' => __('forms.file_type'),
            'avatar.mimes' => __('forms.image_type'),
            'avatar.max' => __('forms.file_too_large', ['size' => 2]),
            'tier.required' => __('affiliates.tier_required'),
            'tier.enum' => __('affiliates.tier_unknown'),
            'payout_method.required' => __('affiliates.payout_method_required'),
            'payout_method.type.required' => __('affiliates.payout_method_required'),
            'payout_method.type.enum' => __('affiliates.payout_method_unknown'),
            'payout_method.account_name.required' => __('affiliates.account_name_required'),
            'payout_method.account_number.required' => __('affiliates.account_number_required'),
            'payout_method.bank_name.required_if' => __('affiliates.bank_name_required'),
        ];
    }

    /**
     * The store the affiliate joins; phone numbers are unique per store.
     */
    protected function targetStore(): Store
    {
        return $this->user()->store;
    }

    /**
     * The affiliate being edited, or null when creating.
     */
    protected function editedAffiliate(): ?Affiliate
    {
        return null;
    }

    protected function passwordPresence(): string
    {
        return 'required';
    }
}
