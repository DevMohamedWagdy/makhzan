<?php

namespace App\Enums;

enum StockMovementType: string
{
    /** Opening quantity of a new product or variant. */
    case Initial = 'initial';

    /** Taken off the shelf by a customer's order. */
    case Sale = 'sale';

    /** Back on the shelf because the order was cancelled. */
    case Cancellation = 'cancellation';

    /** Back on the shelf because the order was returned. */
    case Return = 'return';

    /** New goods received (purchase / restock). */
    case Restock = 'restock';

    /** Stock count correction: the counted quantity replaces the recorded one. */
    case Adjustment = 'adjustment';

    /** Damaged, lost or otherwise written off. */
    case Damage = 'damage';

    /** Moved between two of the store's warehouses (one movement out, one in). */
    case Transfer = 'transfer';

    /** Quantity changed directly in the product form. */
    case ProductEdit = 'product_edit';

    /**
     * Movements a vendor records by hand from the inventory page.
     *
     * @return list<self>
     */
    public static function manual(): array
    {
        return [self::Restock, self::Adjustment, self::Damage];
    }
}
