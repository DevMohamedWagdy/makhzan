<?php

namespace App\Actions\Affiliates;

use App\Enums\CommissionStatus;
use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use Illuminate\Support\Facades\DB;

class SyncAffiliateStats
{
    /**
     * Recomputes the affiliate's counters from their orders: only delivered orders whose
     * commission was earned count; the pending balance is what's earned minus what was paid.
     * Referral codes get their delivered-order counts too. Returns the values before and after.
     *
     * @return array{before: array<string, float|int>, after: array<string, float|int>}
     */
    public function handle(Affiliate $affiliate, bool $dryRun = false): array
    {
        $earned = $affiliate->orders()->where('commission_status', CommissionStatus::Earned);

        $after = [
            'orders_count' => (clone $earned)->count(),
            'sales_total' => round((float) (clone $earned)->sum('subtotal'), 2),
            'earned_commission' => round((float) (clone $earned)->sum('commission_amount'), 2),
        ];
        $after['pending_balance'] = round($after['earned_commission'] - (float) $affiliate->payouts()->where('status', PayoutStatus::Paid)->sum('amount'), 2);

        $before = collect($after)->mapWithKeys(fn ($value, string $key): array => [$key => $affiliate->{$key}])->all();

        if (! $dryRun) {
            DB::transaction(function () use ($affiliate, $after, $earned): void {
                $affiliate->forceFill($after)->save();

                $ordersPerCode = (clone $earned)->whereNotNull('referral_code_id')->toBase()->selectRaw('referral_code_id, count(*) as total')->groupBy('referral_code_id')->pluck('total', 'referral_code_id');

                foreach ($affiliate->referralCodes as $code) {
                    $code->forceFill(['orders' => (int) ($ordersPerCode[$code->id] ?? 0)])->save();
                }
            });
        }

        return ['before' => $before, 'after' => $after];
    }
}
