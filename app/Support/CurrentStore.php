<?php

namespace App\Support;

/**
 * The store the current request acts for. While it is set, every model using
 * App\Models\Concerns\BelongsToStore only sees that store's rows, so a query that
 * forgets to filter by store_id still can't reach another store's data.
 *
 * Unset outside store-bound requests (admin panel, console, queued jobs), where
 * queries see every store as before.
 */
class CurrentStore
{
    private ?int $storeId = null;

    public function id(): ?int
    {
        return $this->storeId;
    }

    public function set(?int $storeId): void
    {
        $this->storeId = $storeId;
    }

    public function forget(): void
    {
        $this->storeId = null;
    }
}
