<?php

namespace App\Actions\Affiliates;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use App\Models\Store;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CreateAffiliate
{
    /**
     * Creates an affiliate under the store's vendor and, if active, its first referral code.
     *
     * @param  array{
     *     full_name: string, phone: string, email: string, password?: string|null, tier: string,
     *     payout_method: array{type: string, account_name: string, account_number: string, bank_name?: string|null, iban?: string|null},
     * }  $attributes
     */
    public function handle(
        Store $store,
        array $attributes,
        AffiliateSource $source,
        AffiliateStatus $status = AffiliateStatus::Active,
        ?UploadedFile $avatar = null,
    ): Affiliate {
        $avatarPath = $avatar?->store('affiliates/avatars', 'public');

        return DB::transaction(function () use ($store, $attributes, $source, $status, $avatarPath): Affiliate {
            $affiliate = new Affiliate([
                'full_name' => $attributes['full_name'],
                'phone' => $attributes['phone'],
                'email' => $attributes['email'],
                'password' => $attributes['password'] ?? null,
                'avatar_path' => $avatarPath,
                'status' => $status,
                'tier' => $attributes['tier'],
                'source' => $source,
                'payout_type' => $attributes['payout_method']['type'],
                'payout_account_name' => $attributes['payout_method']['account_name'],
                'payout_account_number' => $attributes['payout_method']['account_number'],
                'payout_bank_name' => $attributes['payout_method']['bank_name'] ?? null,
                'payout_iban' => $attributes['payout_method']['iban'] ?? null,
            ]);

            $affiliate->vendor()->associate($store->vendor_id);
            $affiliate->store()->associate($store);
            $affiliate->save();

            if ($status === AffiliateStatus::Active) {
                $affiliate->createReferralCode();
            }

            return $affiliate;
        });
    }
}
