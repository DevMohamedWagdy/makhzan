<?php

namespace App\Actions\Affiliates;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use App\Notifications\AffiliateResetPasswordNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Store-scoped password reset for affiliates. Tokens are stored hashed, one per affiliate,
 * expire after `makhzan.affiliates.password_reset_minutes`, and are single-use.
 */
class AffiliatePasswordReset
{
    private const TABLE = 'affiliate_password_reset_tokens';

    /**
     * Emails a reset link when the account can use one. Silently does nothing otherwise
     * (no email on file, not active, or a link was sent moments ago), so callers can
     * always return the same response.
     */
    public function sendLink(Affiliate $affiliate): void
    {
        if (! $affiliate->email || $affiliate->status !== AffiliateStatus::Active || $this->recentlySent($affiliate)) {
            return;
        }

        $token = Str::random(64);

        DB::table(self::TABLE)->updateOrInsert(
            ['affiliate_id' => $affiliate->id],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        $affiliate->notify(new AffiliateResetPasswordNotification($token));
    }

    /**
     * Sets a new password if the token is valid, then consumes the token and signs the
     * affiliate out everywhere. Returns false for an unknown, wrong or expired token.
     */
    public function reset(Affiliate $affiliate, string $token, string $password): bool
    {
        $record = DB::table(self::TABLE)->where('affiliate_id', $affiliate->id)->first();
        $expired = $record && Carbon::parse($record->created_at)->addMinutes(config('makhzan.affiliates.password_reset_minutes'))->isPast();

        if (! $record || $expired || ! Hash::check($token, $record->token)) {
            return false;
        }

        DB::transaction(function () use ($affiliate, $password): void {
            $affiliate->forceFill(['password' => $password])->save();
            $affiliate->tokens()->delete();
            DB::table(self::TABLE)->where('affiliate_id', $affiliate->id)->delete();
        });

        return true;
    }

    private function recentlySent(Affiliate $affiliate): bool
    {
        return DB::table(self::TABLE)
            ->where('affiliate_id', $affiliate->id)
            ->where('created_at', '>', now()->subSeconds(config('makhzan.affiliates.password_reset_throttle_seconds')))
            ->exists();
    }
}
