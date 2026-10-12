<?php

namespace App\Enums;

enum ProductStatus: string
{
    /** Being prepared; hidden from the storefront. */
    case Draft = 'draft';

    /** Visible and purchasable on the storefront. */
    case Active = 'active';

    /** No longer sold; kept for order history. */
    case Archived = 'archived';
}
