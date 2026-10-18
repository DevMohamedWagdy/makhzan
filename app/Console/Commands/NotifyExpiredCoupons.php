<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use App\Notifications\StoreAlertNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('makhzan:notify-expired-coupons')]
#[Description('Tell store owners about active coupons whose end date has just passed')]
class NotifyExpiredCoupons extends Command
{
    /**
     * Execute the console command. Runs hourly; coupons that ended more than two days ago
     * (before this alert existed, or while the scheduler was down) are marked without a message.
     */
    public function handle(): int
    {
        $count = 0;

        Coupon::query()
            ->withoutGlobalScopes()
            ->with('store.vendor')
            ->where('is_active', true)
            ->whereNull('expiry_notified_at')
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->each(function (Coupon $coupon) use (&$count): void {
                if ($coupon->ends_at->greaterThan(now()->subDays(2))) {
                    $coupon->store->vendor->notify(new StoreAlertNotification(StoreAlertNotification::COUPON_EXPIRED, ['coupon_id' => $coupon->id, 'code' => $coupon->code]));
                    $count++;
                }

                $coupon->forceFill(['expiry_notified_at' => now()])->saveQuietly();
            });

        $this->info("Notified owners about {$count} expired coupon(s).");

        return self::SUCCESS;
    }
}
