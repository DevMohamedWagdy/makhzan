<?php

namespace App\Models\Concerns;

use App\Support\ActivityLogger;
use Illuminate\Support\Str;

/**
 * Logs a model's creation, changes and deletion to the activity log ("product.created",
 * "product.updated", …) when the store's team or the platform's admins make them; what customers,
 * affiliates and background jobs do shows on its own pages and isn't logged, to keep the log about
 * decisions people made (and the table small). Models can list noisy attributes in
 * $activityIgnored, limit the events they log in $activityEvents and rename events through
 * activityEvent() (e.g. "store.suspended").
 */
trait LogsActivity
{
    protected static function bootLogsActivity(): void
    {
        static::created(function (self $model): void {
            if ($model->logsActivityFor('created')) {
                ActivityLogger::log($model->activityKey().'.created', $model, ActivityLogger::snapshot($model, $model->activityIgnored()));
            }
        });

        static::updated(function (self $model): void {
            $changes = $model->logsActivityFor('updated') ? ActivityLogger::diff($model, $model->activityIgnored()) : [];

            if ($changes !== []) {
                ActivityLogger::log($model->activityKey().'.'.$model->activityEvent('updated', $changes['new']), $model, $changes);
            }
        });

        static::deleted(function (self $model): void {
            if ($model->logsActivityFor('deleted')) {
                ActivityLogger::log($model->activityKey().'.deleted', $model);
            }
        });
    }

    /**
     * Whether this kind of change is logged: one the model lists in $activityEvents (all by
     * default), made by the store's team or an admin.
     */
    public function logsActivityFor(string $event): bool
    {
        $events = property_exists($this, 'activityEvents') ? $this->activityEvents : ['created', 'updated', 'deleted'];

        return in_array($event, $events, true) && ActivityLogger::isTeamAction();
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
