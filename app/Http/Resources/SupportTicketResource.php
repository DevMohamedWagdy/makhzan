<?php

namespace App\Http\Resources;

use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SupportTicket
 */
class SupportTicketResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'ticket_id' => $this->id,
            'subject' => $this->subject,
            'type' => $this->type,
            'status' => $this->status,
            'store' => $this->whenLoaded('store', fn (): array => ['store_id' => $this->store->id, 'name' => $this->store->name, 'slug' => $this->store->slug]),
            'opened_by' => $this->whenLoaded('vendor', fn (): ?string => $this->vendor?->full_name),
            'last_reply_by' => $this->last_reply_by,
            'messages_count' => $this->whenCounted('messages'),
            'messages' => SupportTicketMessageResource::collection($this->whenLoaded('messages')),
            'last_activity_at' => $this->last_activity_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
