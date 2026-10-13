<?php

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of the store's payments list: an attempt to pay ("payment") or a refund ("refund").
 * The card or wallet is shown by its last four digits only.
 *
 * @mixin object{kind: string, id: int, order_id: int, order_number: int, customer_name: string, method: string, amount: float|string, status: string, note: string|null, transaction_id: string|null, payload: string|null, created_at: string}
 */
class PaymentTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = $this->payload ? json_decode($this->payload, true) : [];
        $source = fn (string $key): ?string => $payload['source_data'][$key] ?? $payload["source_data.{$key}"] ?? $payload["source_data_{$key}"] ?? null;
        $pan = preg_replace('/\D/', '', (string) $source('pan'));

        return [
            'id' => "{$this->kind}-{$this->id}",
            'kind' => $this->kind,
            'order_id' => (int) $this->order_id,
            'order_number' => (int) $this->order_number,
            'customer_name' => $this->customer_name,
            'method' => $this->method,
            'amount' => round((float) $this->amount, 2),
            'status' => $this->status,
            'note' => $this->note,
            'transaction_id' => $this->transaction_id,
            'source' => $pan !== '' ? [
                'last4' => substr($pan, -4),
                'brand' => $source('sub_type'),
            ] : null,
            'created_at' => $this->created_at ? CarbonImmutable::parse($this->created_at)->toIso8601String() : null,
        ];
    }
}
