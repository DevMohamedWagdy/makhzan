<?php

return [

    'method_unavailable' => 'This payment method isn\'t available in the store right now',
    'cannot_pay' => 'This order can\'t be paid right now',
    'start_failed' => 'We couldn\'t open the payment page, try again or choose cash on delivery',
    'awaiting_payment' => 'The order can\'t be confirmed before the customer pays',
    'expired' => 'Payment wasn\'t completed in time',
    'paymob_item' => 'Order #:number',

    'nothing_to_refund' => 'There\'s no online payment left to refund for this order',
    'refund_too_much' => 'You can refund up to :amount EGP',
    'refund_amount_required' => 'Enter the amount to refund',
    'refund_failed' => 'Paymob refused the refund, check your Paymob account and try again',
    'gateway_disconnected' => 'Connect your Paymob account again to refund',

    'secret_key_required' => 'Enter the Secret Key',
    'public_key_required' => 'Enter the Public Key',
    'hmac_secret_required' => 'Enter the HMAC Secret',
    'integration_required' => 'Enter an Integration ID for at least one payment method',
    'integration_id_invalid' => 'The Integration ID is digits only',
    'keys_mode_mismatch' => 'The keys aren\'t from the same mode: one is test and the other is live',
    'no_method_enabled' => 'Turn on at least one payment method to receive orders',
    'paymob_unreachable' => 'We couldn\'t reach Paymob right now, try again shortly',
    'paymob_secret_invalid' => 'The Secret Key is incorrect',
    'paymob_integration_invalid' => 'The Integration ID is incorrect, inactive, or from a different mode than the keys (test/live)',

];
