<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Models\Vendor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Who gets the emailed sales report: accounts of the store (the owner and active team members,
 * the sender included) and/or up to MAX_EMAILS other addresses.
 */
class EmailReportRequest extends ReportRequest
{
    public const MAX_EMAILS = 5;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'vendor_ids' => ['array', 'required_without:emails'],
            'vendor_ids.*' => ['integer', 'distinct', Rule::in($this->user()->store->activeAccounts()->pluck('id')->all())],
            'emails' => ['array', 'max:'.self::MAX_EMAILS, 'required_without:vendor_ids'],
            'emails.*' => ['string', 'email:rfc', 'max:255', 'distinct:ignore_case'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vendor_ids.required_without' => __('reports.email.recipients_required'),
            'emails.required_without' => __('reports.email.recipients_required'),
            'vendor_ids.*.in' => __('reports.email.unknown_account'),
            'emails.max' => __('reports.email.too_many_emails', ['max' => self::MAX_EMAILS]),
            'emails.*.email' => __('reports.email.invalid_email'),
        ];
    }

    /**
     * The chosen accounts.
     *
     * @return Collection<int, Vendor>
     */
    public function recipientAccounts(): Collection
    {
        $ids = array_map('intval', $this->validated('vendor_ids', []));

        return $this->user()->store->activeAccounts()->filter(fn (Vendor $vendor): bool => in_array($vendor->id, $ids, true))->values();
    }

    /**
     * The other addresses, lower-cased, leaving out any that a chosen account already uses.
     *
     * @return list<string>
     */
    public function recipientEmails(): array
    {
        $accounts = $this->recipientAccounts()->map(fn (Vendor $vendor): string => strtolower($vendor->email))->all();

        return collect($this->validated('emails', []))
            ->map(fn (string $email): string => strtolower(trim($email)))
            ->reject(fn (string $email): bool => in_array($email, $accounts, true))
            ->unique()
            ->values()
            ->all();
    }
}
