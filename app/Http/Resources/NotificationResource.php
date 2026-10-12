<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * @mixin DatabaseNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'message' => $this->message(),
            'details' => collect($this->data)->except('message'),
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * The notification text in the current request's language, built from its stored details.
     */
    private function message(): string
    {
        $details = $this->data;

        return match ($this->type) {
            'payout_requested' => __('notifications.payout_requested.message', [
                'affiliate' => $details['affiliate_name'],
                'amount' => number_format((float) $details['amount'], 2),
            ]),
            'affiliate_registered' => __($details['requires_approval'] ? 'notifications.affiliate_registered.pending' : 'notifications.affiliate_registered.active', [
                'affiliate' => $details['affiliate_name'],
            ]),
            default => $details['message'] ?? '',
        };
    }
}
