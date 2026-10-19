<?php

namespace App\Actions\Affiliates;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use SplFileObject;

class ImportAffiliates
{
    public function __construct(private CreateAffiliate $createAffiliate) {}

    /**
     * Imports rows using the CSV template columns. Invalid rows are skipped and reported;
     * valid rows are imported. Imported affiliates have no password until they set one (by email).
     *
     * @param  iterable<int, array<string, mixed>>  $rows  Each row may carry its original `line` number.
     * @return array{status: string, imported: int, skipped: int, errors: list<array{row: int, message: string}>}
     */
    public function handle(Store $store, iterable $rows): array
    {
        $existingPhones = $store->affiliates()->pluck('phone')->flip()->all();
        $existingEmails = $store->affiliates()->pluck('email')->filter()->map(fn (string $email): string => mb_strtolower($email))->flip()->all();
        $imported = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $line = (int) ($row['line'] ?? $index + 2);
            [$attributes, $message] = $this->normalizeRow($row);

            if ($message === null && isset($existingPhones[$attributes['phone']])) {
                $message = __('affiliates.phone_taken');
            }

            if ($message === null && isset($existingEmails[$attributes['email']])) {
                $message = __('affiliates.email_taken');
            }

            if ($message !== null) {
                $errors[] = ['row' => $line, 'message' => $message];

                continue;
            }

            $this->createAffiliate->handle($store, $attributes, AffiliateSource::BulkImport);
            $existingPhones[$attributes['phone']] = true;
            $existingEmails[$attributes['email']] = true;
            $imported++;
        }

        return ['status' => 'completed', 'imported' => $imported, 'skipped' => count($errors), 'errors' => $errors];
    }

    /**
     * Reads a CSV (with or without a UTF-8 BOM) into rows keyed by the header row.
     *
     * @return list<array<string, string|int>>
     */
    public function rowsFromCsv(UploadedFile $file): array
    {
        $csv = new SplFileObject($file->getRealPath());
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD | SplFileObject::DROP_NEW_LINE);

        $header = null;
        $rows = [];

        foreach ($csv as $lineIndex => $cells) {
            if (! is_array($cells) || $cells === [null]) {
                continue;
            }

            if ($header === null) {
                $header = array_map(fn ($key) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $key))), $cells);

                continue;
            }

            $values = array_map(fn ($value) => trim((string) $value), array_pad($cells, count($header), ''));
            $rows[] = [...array_combine($header, array_slice($values, 0, count($header))), 'line' => $lineIndex + 1];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{0: array<string, mixed>, 1: string|null} Normalized attributes and the first error, if any.
     */
    private function normalizeRow(array $row): array
    {
        $phone = PhoneNumber::normalize($row['phone'] ?? '');
        $fullName = trim((string) ($row['full_name'] ?? ''));
        $tier = filled($row['tier'] ?? null) ? AffiliateTier::fromInput($row['tier']) : AffiliateTier::New;
        $payoutType = filled($row['payout_type'] ?? null) ? PayoutMethod::fromInput($row['payout_type']) : PayoutMethod::VodafoneCash;

        $attributes = [
            'full_name' => $fullName,
            'phone' => $phone,
            'email' => mb_strtolower(trim((string) ($row['email'] ?? ''))),
            'tier' => $tier?->value,
            'payout_method' => [
                'type' => $payoutType?->value,
                'account_name' => trim((string) ($row['payout_account_name'] ?? '')) ?: $fullName,
                'account_number' => trim((string) ($row['payout_account_number'] ?? '')) ?: $phone,
            ],
        ];

        $validator = Validator::make($attributes, [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'regex:'.PhoneNumber::PATTERN],
            'email' => ['required', 'email', 'max:255'],
            'tier' => ['required'],
            'payout_method.type' => ['required'],
            'payout_method.account_number' => ['required', 'string', 'max:64'],
        ], [
            'full_name.required' => __('affiliates.import.name_required'),
            'phone.required' => __('affiliates.import.phone_invalid'),
            'phone.regex' => __('affiliates.import.phone_invalid'),
            'email.required' => __('affiliates.import.email_required'),
            'email.email' => __('affiliates.import.email_invalid'),
            'tier.required' => __('affiliates.tier_unknown'),
            'payout_method.type.required' => __('affiliates.payout_method_unknown'),
            'payout_method.account_number.required' => __('affiliates.import.account_number_required'),
        ]);

        return [$attributes, $validator->fails() ? $validator->errors()->first() : null];
    }
}
