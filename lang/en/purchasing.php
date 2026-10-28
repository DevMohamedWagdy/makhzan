<?php

return [

    'not_editable' => "A purchase order can't be edited after goods were received against it",
    'cannot_receive' => "Goods can't be received on a closed or cancelled purchase order",
    'cannot_cancel' => "A partly received purchase order can't be cancelled; close it instead",
    'cannot_close' => 'Only a partly received purchase order can be closed',
    'cannot_order' => 'The purchase order is not a draft',
    'cannot_delete' => 'Only drafts can be deleted',
    'item_not_found' => 'The item is not on this purchase order',
    'exceeds_remaining' => 'The quantity is more than what remains (:remaining)',
    'variant_deleted' => "This product was deleted and can't be added to stock",
    'nothing_to_receive' => 'Enter a received quantity for at least one item',
    'receipt_note' => 'Received on purchase order #:number',
    'supplier_required' => 'Choose a supplier',
    'supplier_name_required' => "Enter the supplier's name",
    'supplier_has_orders' => "A supplier with purchase orders can't be deleted",
    'items_required' => 'Add at least one item',
    'items_distinct' => 'This item is already on the purchase order',
    'variant_invalid' => 'Product not found',
    'quantity_min' => 'The quantity must be at least 1',
    'cost_required' => 'Enter the unit cost',
    'not_found' => 'Purchase order not found',
    'supplier_not_found' => 'Supplier not found',
    'import' => [
        'too_many_rows' => 'The file can have at most :max rows',
        'empty' => 'The file has no rows',
        'not_found' => 'Product not found (variant_id or sku)',
        'ambiguous_sku' => 'This SKU is used by more than one product; use variant_id',
        'invalid_stock' => 'The quantity must be a whole number, not negative',
        'invalid_cost' => 'The cost must be a number, not negative',
        'note' => 'Inventory file import',
    ],

    'statement_receipt' => 'Received :units units',
    'return_note' => 'Return to :supplier #:number',
    'return_exceeds_stock' => 'The quantity of ":product" returned is more than the warehouse holds',
    'payment_methods' => [
        'cash' => 'Cash',
        'bank_transfer' => 'Bank transfer',
        'wallet' => 'Mobile wallet',
        'cheque' => 'Cheque',
        'other' => 'Other',
    ],

];
