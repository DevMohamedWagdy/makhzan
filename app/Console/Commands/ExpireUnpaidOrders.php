<?php

namespace App\Console\Commands;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('makhzan:expire-unpaid-orders')]
#[Description('Cancel online orders whose payment window has passed, putting their stock back')]
class ExpireUnpaidOrders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(UpdateOrderStatus $updateStatus): int
    {
        $expired = 0;

        Order::query()
            ->where('status', OrderStatus::Pending)
            ->whereIn('payment_status', [PaymentStatus::Pending, PaymentStatus::Failed])
            ->where('payment_expires_at', '<=', now())
            ->orderBy('id')
            ->each(function (Order $order) use ($updateStatus, &$expired): void {
                // A payment may land between the query and the lock: such orders are left alone.
                $updated = $updateStatus->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_SYSTEM, __('payments.expired', locale: config('makhzan.locales')[0]), onlyIfUnpaid: true);

                if ($updated->status === OrderStatus::Cancelled) {
                    $expired++;
                }
            });

        $this->info("Cancelled {$expired} unpaid order(s).");

        return self::SUCCESS;
    }
}
