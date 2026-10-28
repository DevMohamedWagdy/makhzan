<?php

namespace App\Actions\Customers;

use App\Models\Customer;
use App\Notifications\CustomerResetPasswordNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

/**
 * Store-scoped password reset for shoppers. Tokens are stored hashed, one per customer,
 * expire after `makhzan.customers.password_reset_minutes`, and are single-use.
 */
class CustomerPasswordReset
{
    private const TABLE = 'customer_password_reset_tokens';

    /**
     * Emails a reset link when the account can use one. Silently does nothing otherwise
     * (no email on file, or a link was sent moments ago), so callers can always return
     * the same response.
     */
    public function sendLink(Customer $customer): void
    {
        if (! $customer->email || $this->recentlySent($customer)) {
            return;
        }

        $token = Str::random(64);

        DB::table(self::TABLE)->updateOrInsert(
            ['customer_id' => $customer->id],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        try {
            $customer->notify(new CustomerResetPasswordNotification($token));
        } catch (Throwable $exception) {
            // A mail outage shouldn't reveal whether the account exists or fail the request.
            report($exception);
        }
    }

    /**
     * Sets a new password if the token is valid, then consumes the token and signs the
     * customer out everywhere. Returns false for an unknown, wrong or expired token.
     */
    public function reset(Customer $customer, string $token, string $password): bool
    {
        $record = DB::table(self::TABLE)->where('customer_id', $customer->id)->first();
        $expired = $record && Carbon::parse($record->created_at)->addMinutes(config('makhzan.customers.password_reset_minutes'))->isPast();

        if (! $record || $expired || ! Hash::check($token, $record->token)) {
            return false;
        }

        DB::transaction(function () use ($customer, $password): void {
            $customer->forceFill(['password' => $password])->save();
            $customer->tokens()->delete();
            DB::table(self::TABLE)->where('customer_id', $customer->id)->delete();
        });

        return true;
    }

    private function recentlySent(Customer $customer): bool
    {
        return DB::table(self::TABLE)
            ->where('customer_id', $customer->id)
            ->where('created_at', '>', now()->subSeconds(config('makhzan.customers.password_reset_throttle_seconds')))
            ->exists();
    }
}
