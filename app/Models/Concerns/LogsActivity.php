<?php

namespace App\Models\Concerns;

use App\Support\ActivityLogger;
use Illuminate\Support\Str;

/**
 * Logs a model's creation, changes and deletion to the activity log ("product.created",
 * "product.updated", …). Models can list noisy attributes in $activityIgnored and rename
 * events through activityEvent() (e.g. "store.suspended").
 */
trait LogsActivity
{
    protected static function bootLogsActivity(): void
    {
        static::created(fn (self $model) => ActivityLogger::log($model->activityKey().'.created', $model, ActivityLogger::snapshot($model, $model->activityIgnored())));

        static::updated(function (self $model): void {
            $changes = ActivityLogger::diff($model, $model->activityIgnored());

            if ($changes !== []) {
                ActivityLogger::log($model->activityKey().'.'.$model->activityEvent('updated', $changes['new']), $model, $changes);
            }
        });

        static::deleted(fn (self $model) => ActivityLogger::log($model->activityKey().'.deleted', $model));
    }

    public function activityKey(): string
    {
        return Str::snake(class_basename($this));
    }

    /**
     * Attributes whose changes aren't worth logging.
     *
     * @return list<string>
     */
    public function activityIgnored(): array
    {
        return property_exists($this, 'activityIgnored') ? $this->activityIgnored : [];
    }

    /**
     * The event name for a change; models override it to name meaningful transitions.
     *
     * @param  array<string, mixed>  $changed
     */
    public function activityEvent(string $default, array $changed): string
    {
        return $default;
    }
}
