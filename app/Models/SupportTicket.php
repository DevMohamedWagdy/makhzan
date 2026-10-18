<?php

namespace App\Models;

use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Models\Concerns\BelongsToStore;
use Database\Factories\SupportTicketFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A merchant's conversation with the platform's support team: a problem to fix or a
 * suggestion. Both sides reply until an admin closes it; only an admin can reopen it.
 */
#[Fillable(['vendor_id', 'subject', 'type'])]
class SupportTicket extends Model
{
    /** Who wrote a message, and so who's waiting on whom. */
    public const AUTHOR_VENDOR = 'vendor';

    public const AUTHOR_ADMIN = 'admin';

    /** @use HasFactory<SupportTicketFactory> */
    use BelongsToStore, HasFactory;

    /** @var array<string, mixed> */
    protected $attributes = [
        'status' => 'open',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => SupportTicketType::class,
            'status' => SupportTicketStatus::class,
            'last_activity_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * The dashboard account that opened the ticket (the owner or a staff member).
     *
     * @return BelongsTo<Vendor, $this>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * @return HasMany<SupportTicketMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(SupportTicketMessage::class, 'ticket_id')->oldest('id');
    }

    /**
     * One of this ticket's attachments, or a 404 (an attachment id from another ticket).
     */
    public function findAttachment(int $attachmentId): SupportTicketAttachment
    {
        return SupportTicketAttachment::query()
            ->whereKey($attachmentId)
            ->whereHas('message', fn ($query) => $query->where('ticket_id', $this->id))
            ->firstOrFail();
    }

    public function isClosed(): bool
    {
        return $this->status === SupportTicketStatus::Closed;
    }
}
