<?php

namespace App\Http\Resources\Concerns;

/**
 * Admin lists span every store, so each row says which store it belongs to. The `store`
 * relation should be eager loaded.
 */
trait IncludesStoreSummary
{
    /**
     * @return array{store_id: int, name: string, slug: string}|null
     */
    protected function storeSummary(): ?array
    {
        $store = $this->resource->store;

        return $store ? ['store_id' => $store->id, 'name' => $store->name, 'slug' => $store->slug] : null;
    }
}
