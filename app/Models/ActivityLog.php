<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One thing that happened (see ActivityLogger): an actor, an event such as "order.updated",
 * the record it happened to, and the attributes that changed.
 */
#[Fillable(['actor_type', 'actor_id', 'actor_name', 'store_id', 'event', 'subject_type', 'subject_id', 'subject_label', 'changes', 'ip', 'user_agent'])]
class ActivityLog extends Model
{
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
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
