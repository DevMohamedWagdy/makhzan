<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One thing that happened (see ActivityLogger): an actor, an event such as "order.updated",
 * the record it happened to, and the attributes that changed. Entries older than
 * makhzan.activity_log.retention_days are pruned daily (routes/console.php).
 */
#[Fillable(['actor_type', 'actor_id', 'actor_name', 'store_id', 'event', 'subject_type', 'subject_id', 'subject_label', 'changes', 'ip', 'user_agent'])]
class ActivityLog extends Model
{
    use BelongsToStore, MassPrunable;

    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Entries past the retention period.
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subDays((int) config('makhzan.activity_log.retention_days')));
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
