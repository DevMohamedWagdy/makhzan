<?php

namespace App\Http\Resources;

use App\Models\VendorEmailCampaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An email sent to merchants, as the admin panel's history shows it.
 *
 * @mixin VendorEmailCampaign
 */
class VendorEmailCampaignResource extends JsonResource
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
            'subject' => $this->subject,
            'body' => $this->body,
            'audience' => $this->audience,
            'recipients_count' => $this->recipients_count,
            'sent_count' => $this->sent_count,
            'failed_count' => $this->failed_count,
            'status' => $this->status,
            'sent_by' => $this->admin?->full_name,
            'created_at' => $this->created_at?->toIso8601String(),
            'finished_at' => $this->finished_at?->toIso8601String(),
        ];
    }
}
