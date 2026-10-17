<?php

namespace App\Models\Concerns;

use App\Support\CurrentStore;
use Illuminate\Database\Eloquent\Builder;

/**
 * Limits the model to the current store's rows (see App\Support\CurrentStore). This is a
 * safety net under the explicit store filters and policies, not a replacement for them:
 * outside a store-bound request no filter applies.
 */
trait BelongsToStore
{
    public static function bootBelongsToStore(): void
    {
        static::addGlobalScope('store', function (Builder $builder): void {
            $storeId = app(CurrentStore::class)->id();

            if ($storeId !== null) {
                $builder->where($builder->getModel()->qualifyColumn('store_id'), $storeId);
            }
        });
    }
}
