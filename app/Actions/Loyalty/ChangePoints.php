<?php

namespace App\Actions\Loyalty;

use App\Enums\LoyaltyTransactionType;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Adds or takes points from a customer and records it in their ledger. The customer row is
 * locked so concurrent orders can't spend the same points twice. Spending more than the
 * balance is refused; taking points back (a returned order, a correction) stops at zero, so
 * the ledger records what was actually removed.
 */
class ChangePoints
{
    /**
     * @throws ValidationException
     */
    public function handle(Customer $customer, int $points, LoyaltyTransactionType $type, string $actor, ?Order $order = null, ?string $note = null): ?LoyaltyTransaction
    {
        if ($points === 0) {
            return null;
        }

        return DB::transaction(function () use ($customer, $points, $type, $actor, $order, $note): ?LoyaltyTransaction {
            $locked = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();

            if ($type === LoyaltyTransactionType::Redeemed && $locked->points_balance < -$points) {
                throw ValidationException::withMessages(['redeem_points' => __('loyalty.insufficient', ['balance' => $locked->points_balance])]);
            }

            $balance = max(0, $locked->points_balance + $points);
            $applied = $balance - $locked->points_balance;

            if ($applied === 0) {
                return null;
            }

            $locked->forceFill(['points_balance' => $balance])->save();
            $customer->points_balance = $balance;

            return $locked->loyaltyTransactions()->create([
                'store_id' => $locked->store_id,
                'order_id' => $order?->id,
                'type' => $type,
                'points' => $applied,
                'balance_after' => $balance,
                'note' => $note,
                'actor' => $actor,
            ]);
        });
    }
}
