<?php

namespace App\Http\Resources;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ActivityLog
 */
class ActivityLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'log_id' => $this->id,
            'event' => $this->event,
            'actor' => ['type' => $this->actor_type, 'id' => $this->actor_id, 'name' => $this->actor_name],
            'store' => $this->whenLoaded('store', fn (): ?array => $this->store ? ['store_id' => $this->store->id, 'name' => $this->store->name] : null),
            'subject' => ['type' => $this->subject_type, 'id' => $this->subject_id, 'label' => $this->subject_label],
            'changes' => $this->changes,
            'ip' => $this->ip,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
