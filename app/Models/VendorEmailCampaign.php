<?php

namespace App\Models;

use Database\Factories\VendorEmailCampaignFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One email the platform team sent to merchants: to every active store owner ("all") or to the ones picked
 * ("selected", their ids in recipient_ids), with how many went out and how many failed.
 */
#[Fillable(['admin_id', 'subject', 'body', 'audience', 'recipient_ids', 'recipients_count', 'sent_count', 'failed_count', 'status', 'finished_at'])]
class VendorEmailCampaign extends Model
{
    /** @use HasFactory<VendorEmailCampaignFactory> */
    use HasFactory;

    public const AUDIENCE_ALL = 'all';

    public const AUDIENCE_SELECTED = 'selected';

    public const STATUS_SENDING = 'sending';

    public const STATUS_SENT = 'sent';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_FAILED = 'failed';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'recipient_ids' => 'array',
            'recipients_count' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }

    /**
     * The accounts this email goes to: active store owners with an email, all of them or the picked ones.
     *
     * @return Builder<Vendor>
     */
    public function recipients(): Builder
    {
        return self::eligibleRecipients()
            ->when($this->audience === self::AUDIENCE_SELECTED, fn (Builder $query) => $query->whereKey($this->recipient_ids ?? []));
    }

    /**
     * Store owners who can receive these emails: active accounts with an email address.
     *
     * @return Builder<Vendor>
     */
    public static function eligibleRecipients(): Builder
    {
        return Vendor::query()->whereNull('store_id')->where('is_active', true)->whereNotNull('email')->where('email', '!=', '');
    }
}
