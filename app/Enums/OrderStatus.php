<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Returned = 'returned';

    /**
     * Statuses this one may move to. A shipped order the customer refuses counts as returned.
     *
     * @return list<self>
     */
    public function next(): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered, self::Returned],
            self::Delivered => [self::Returned],
            self::Cancelled, self::Returned => [],
        };
    }

    public function canMoveTo(self $status): bool
    {
        return in_array($status, $this->next(), true);
    }

    /**
     * Stock leaves the shelf when an order is placed and comes back when it's cancelled or returned.
     */
    public function restocks(): bool
    {
        return $this === self::Cancelled || $this === self::Returned;
    }

    /**
     * The timestamp column set when an order reaches this status.
     */
    public function timestampColumn(): ?string
    {
        return match ($this) {
            self::Pending => null,
            default => "{$this->value}_at",
        };
    }
}
