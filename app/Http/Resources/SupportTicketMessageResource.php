<?php

namespace App\Http\Resources;

use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SupportTicketMessage
 */
class SupportTicketMessageResource extends JsonResource
{
    /**
     * Attachments are listed by id and fetched through the authenticated download route of
     * the side asking (vendor or admin); there is no public URL.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'message_id' => $this->id,
            'author_type' => $this->author_type,
            'author_name' => $this->isFromAdmin() ? ($this->admin?->full_name ?? __('support.team_name')) : $this->vendor?->full_name,
            'body' => $this->body,
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn (SupportTicketAttachment $attachment): array => [
                'attachment_id' => $attachment->id,
                'name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'is_image' => $attachment->isImage(),
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
