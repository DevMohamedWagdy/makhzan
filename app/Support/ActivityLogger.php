<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Admin;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Throwable;

/**
 * Writes the platform's activity log. The actor is whoever is signed in to the current
 * request (admin, vendor or staff, customer, affiliate), or "system" for queued jobs, the
 * scheduler and webhooks. Logging never breaks the action it records.
 */
class ActivityLogger
{
    /** Attributes never written to the log. */
    private const HIDDEN = ['password', 'remember_token', 'credentials', 'token', 'webhook_secret'];

    private static bool $muted = false;

    /**
     * @param  array{old?: array<string, mixed>, new?: array<string, mixed>}|array<string, mixed>  $changes
     */
    public static function log(string $event, ?Model $subject = null, array $changes = [], ?int $storeId = null, ?string $label = null, ?Model $actor = null): void
    {
        if (self::$muted) {
            return;
        }

        try {
            $actor ??= self::currentActor();
            // Only an HTTP request (one that matched a route) has a meaningful IP and browser;
            // console commands and queued jobs log without them.
            $request = request()->route() ? request() : null;

            ActivityLog::query()->create([
                'actor_type' => $actor ? self::typeOf($actor) : 'system',
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor ? self::nameOf($actor) : null,
                'store_id' => $storeId ?? self::storeIdOf($subject) ?? self::storeIdOf($actor),
                'event' => $event,
                'subject_type' => $subject ? self::typeOf($subject) : null,
                'subject_id' => $subject?->getKey(),
                'subject_label' => $label ?? ($subject ? self::labelOf($subject) : null),
                'changes' => $changes ?: null,
                'ip' => $request?->ip(),
                'user_agent' => $request ? Str::limit((string) $request->userAgent(), 250, '') : null,
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * Runs the callback without writing logs (e.g. bulk seeding).
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public static function withoutLogging(callable $callback): mixed
    {
        $previous = self::$muted;
        self::$muted = true;

        try {
            return $callback();
        } finally {
            self::$muted = $previous;
        }
    }

    /**
     * Old and new values of the attributes a save changed, minus noise and secrets.
     *
     * @param  list<string>  $ignored
     * @return array{old: array<string, mixed>, new: array<string, mixed>}|array{}
     */
    public static function diff(Model $model, array $ignored = []): array
    {
        $skip = [...self::HIDDEN, ...$model->getHidden(), 'created_at', 'updated_at', ...$ignored];
        $new = array_diff_key($model->getChanges(), array_flip($skip));

        if ($new === []) {
            return [];
        }

        $old = array_intersect_key($model->getOriginal(), $new);

        return ['old' => array_map(self::scalar(...), $old), 'new' => array_map(self::scalar(...), array_intersect_key($model->getAttributes(), $new))];
    }

    /**
     * The attributes of a new record, minus noise and secrets.
     *
     * @param  list<string>  $ignored
     * @return array{new: array<string, mixed>}
     */
    public static function snapshot(Model $model, array $ignored = []): array
    {
        $skip = [...self::HIDDEN, ...$model->getHidden(), 'created_at', 'updated_at', 'id', ...$ignored];

        return ['new' => array_map(self::scalar(...), array_diff_key($model->getAttributes(), array_flip($skip)))];
    }

    /**
     * Whether the current request is made by a store's team (owner or staff) or a platform admin:
     * the actors whose record changes the log keeps.
     */
    public static function isTeamAction(): bool
    {
        $actor = self::currentActor();

        return $actor instanceof Vendor || $actor instanceof Admin;
    }

    private static function currentActor(): ?Model
    {
        if (App::runningInConsole() && ! App::runningUnitTests()) {
            return null;
        }

        try {
            $user = request()->user();
        } catch (Throwable) {
            return null;
        }

        return $user instanceof Model ? $user : null;
    }

    private static function typeOf(Model $model): string
    {
        return Str::snake(class_basename($model));
    }

    private static function nameOf(Model $actor): ?string
    {
        return $actor->getAttribute('full_name') ?? $actor->getAttribute('name');
    }

    private static function labelOf(Model $subject): ?string
    {
        return match (true) {
            method_exists($subject, 'activityLabel') => $subject->activityLabel(),
            default => (string) ($subject->getAttribute('name') ?? $subject->getAttribute('full_name') ?? $subject->getAttribute('code') ?? $subject->getAttribute('number') ?? '#'.$subject->getKey()),
        };
    }

    private static function storeIdOf(?Model $model): ?int
    {
        return match (true) {
            $model === null, $model instanceof Admin => null,
            $model instanceof Store => $model->getKey(),
            $model instanceof Vendor => $model->store_id ?? Store::query()->where('vendor_id', $model->getKey())->value('id'),
            $model instanceof Customer, $model instanceof Affiliate => $model->getAttribute('store_id'),
            default => $model->getAttribute('store_id'),
        };
    }

    private static function scalar(mixed $value): mixed
    {
        return is_string($value) && mb_strlen($value) > 500 ? mb_substr($value, 0, 500).'…' : $value;
    }
}
