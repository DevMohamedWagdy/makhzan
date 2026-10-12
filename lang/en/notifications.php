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
    'order_placed' => [
        'message' => 'New order #:number from :customer for :total EGP',
        'subject' => 'New order #:number',
        'line' => 'You received a new order #:number from :customer for :total EGP.',
        'action' => 'View order',
    ],
    'open_portal' => 'Open the affiliate portal',
    'reason' => 'Reason: :reason',
    'store_note' => 'Note from the store: :note',
    'account_approved' => [
        'subject' => 'You have been approved as a :store affiliate',
        'message' => 'Your application to join the :store affiliate team was approved. Your referral links are ready to share.',
    ],
    'account_rejected' => [
        'subject' => 'About your application to :store',
        'message' => 'Sorry, your application to join the :store affiliate team was not approved.',
    ],
    'account_frozen' => [
        'subject' => 'Your :store affiliate account has been suspended',
        'message' => ':store has suspended your affiliate account and your referral links are disabled for now. Contact the store for details.',
    ],
    'account_reactivated' => [
        'subject' => 'Your :store account is active again',
        'message' => ':store has reactivated your affiliate account and your referral links work again.',
    ],
    'payout_paid' => [
        'subject' => ':amount EGP has been transferred to you',
        'message' => 'The store transferred :amount EGP of your commission to your payout method.',
        'reference' => 'Transaction reference: :reference',
    ],
    'payout_rejected' => [
        'subject' => 'Your :amount EGP transfer request was declined',
        'message' => 'The store declined your :amount EGP transfer request; your balance is unchanged.',
    ],
    'referral_order_placed' => 'New order #:number through your links, expected commission :commission EGP on delivery',
    'commission_earned' => 'Order #:number was delivered and :commission EGP was added to your balance',
    'commission_cancelled' => 'Order #:number was cancelled, so its commission (:commission EGP) won\'t count',
    'commission_reversed' => 'Order #:number was returned, so its commission (:commission EGP) was deducted from your balance',
    'commission_changed' => [
        'percentage' => 'Your commission is now :value% of each new order',
        'fixed' => 'Your commission is now :value EGP on each new order',
    ],

];
