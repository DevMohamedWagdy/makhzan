<?php

namespace App\Actions\Affiliates;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use App\Notifications\AffiliateAccountStatusNotification;

/**
 * Freezes or (re)activates an affiliate and tells them about it. Used by the store's
 * dashboard and by the platform admin panel.
 */
class ChangeAffiliateStatus
{
    public function handle(Affiliate $affiliate, AffiliateStatus $status, ?string $reason = null): Affiliate
    {
        $previous = $affiliate->status;

        if ($status === AffiliateStatus::Frozen) {
            $affiliate->freeze($reason);
        } else {
            $affiliate->activate();
        }

        $event = match (true) {
            $previous === $affiliate->status => null,
            $affiliate->status === AffiliateStatus::Frozen => AffiliateAccountStatusNotification::FROZEN,
            $previous === AffiliateStatus::Pending => AffiliateAccountStatusNotification::APPROVED,
            default => AffiliateAccountStatusNotification::REACTIVATED,
        };

        if ($event) {
            $affiliate->notify(AffiliateAccountStatusNotification::for($affiliate, $event, $event === AffiliateAccountStatusNotification::FROZEN ? $reason : null));
        }

        return $affiliate;
    }
}
