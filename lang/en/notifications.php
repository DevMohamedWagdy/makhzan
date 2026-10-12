<?php

return [

    'greeting' => 'Hello :name',
    'ignore_reset' => 'If you didn\'t request a reset, ignore this message and nothing will change.',
    'payout_requested' => [
        'message' => ':affiliate requested a transfer of :amount EGP from their commission balance',
        'subject' => 'Commission transfer request from :affiliate',
        'line' => 'Your affiliate :affiliate requested a transfer of :amount EGP from their commission balance.',
        'note' => 'Affiliate\'s note: :note',
        'action' => 'Review request',
        'outro' => 'After transferring, record the payment from the affiliate\'s profile so it is deducted from their balance.',
    ],
    'affiliate_registered' => [
        'pending' => ':affiliate applied to join your affiliate team and is waiting for your approval',
        'active' => ':affiliate joined your affiliate team through the registration link',
        'subject' => 'New affiliate: :affiliate',
        'review' => 'Review application',
        'view' => 'View affiliate',
    ],
    'affiliate_reset_password' => [
        'subject' => 'Reset your password - :store',
        'intro' => 'We received a request to reset the password of your affiliate account at :store.',
        'action' => 'Set a new password',
        'expiry' => 'This link expires in :minutes minutes and can be used only once.',
    ],
    'vendor_reset_password' => [
        'subject' => 'Reset your password - Makhzan',
        'intro' => 'We received a request to reset the password of your Makhzan account.',
        'action' => 'Reset password',
        'expiry' => 'This link expires in :minutes minutes.',
    ],

];
