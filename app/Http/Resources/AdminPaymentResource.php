<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\IncludesStoreSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An online payment in the admin panel: its store, order, amount, refunds and the
 * gateway's references. Expects `store` and `order` loaded.
 */
class AdminPaymentResource extends JsonResource
{
    use IncludesStoreSummary;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'payment_id' => $this->id,
            'store' => $this->storeSummary(),
            'order' => $this->order ? ['order_id' => $this->order->id, 'number' => $this->order->number, 'customer_name' => $this->order->recipient_name] : null,
            'gateway' => $this->gateway,
            'method' => $this->method?->value,
            'status' => $this->status?->value,
            'amount' => (float) $this->amount,
            'refunded_amount' => (float) $this->refunded_amount,
            'transaction_id' => $this->gateway_transaction_id,
            'failure_reason' => $this->failure_reason,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
