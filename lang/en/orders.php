<?php

return [

    'not_found' => 'Order not found',
    'sign_in_required' => 'Sign in to your store account to continue',
    'customer_phone_taken' => 'This number is already registered; sign in instead of creating a new account',
    'customer_email_taken' => 'This email is already used by another account',
    'recipient_required' => 'Enter the recipient name',
    'address_line_required' => 'Enter the detailed address (street and building number)',
    'address_not_found' => 'Address not found',
    'customer_not_found' => 'Customer not found',
    'report_period_too_long' => 'A report can cover at most :days days',
    'cart_empty' => 'Your cart is empty',
    'item_unavailable' => 'This product is no longer available',
    'item_insufficient' => 'Only :available left of this product',
    'no_delivery' => 'The store doesn\'t deliver to this governorate right now',
    'invalid_transition' => 'The order can\'t be moved to this status',
    'cannot_cancel' => 'The order can\'t be cancelled after the store confirmed it; contact the store',
    'price_invalid' => 'Enter a valid price',

    'carriers' => [
        'bosta' => 'Bosta',
    ],
    'shipping' => [
        'bosta_not_connected' => 'Connect your Bosta account first from the shipping page.',
        'must_be_confirmed' => 'Confirm the order before shipping it.',
        'already_shipped' => 'This order already has a shipment.',
        'bosta_failed' => 'Bosta could not create the shipment: :reason',
        'bosta_key_invalid' => 'This API key is not valid. Copy it from your Bosta dashboard (Settings → API Integration).',
        'no_bosta_orders' => 'None of the selected orders has a Bosta shipment.',
        'updated_by_bosta' => 'Updated automatically by Bosta',
    ],
];
