<?php

namespace App\Enums;

enum PurchaseOrderStatus: string
{
    /** Being prepared; not sent to the supplier yet. */
    case Draft = 'draft';

    /** Sent to the supplier; waiting for the goods. */
    case Ordered = 'ordered';

    /** Some of the goods arrived. */
    case Partial = 'partial';

    /** Everything ordered arrived. */
    case Received = 'received';

    /** Partly received and closed: the rest won't arrive. */
    case Closed = 'closed';

    /** Cancelled before anything arrived. */
    case Cancelled = 'cancelled';

    /**
     * Items can still be changed: nothing has been received yet.
     */
    public function isEditable(): bool
    {
        return $this === self::Draft || $this === self::Ordered;
    }

    /**
     * Goods can be received against it (receiving a draft also marks it ordered).
     */
    public function canReceive(): bool
    {
        return in_array($this, [self::Draft, self::Ordered, self::Partial], true);
    }

    /**
     * Still waiting for goods (counts toward stock on order).
     */
    public function isOpen(): bool
    {
        return $this === self::Ordered || $this === self::Partial;
    }
}
