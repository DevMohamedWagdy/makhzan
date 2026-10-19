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
    'admin' => [
        'store_registered' => 'New store :store registered (:owner)',
        'ticket_opened' => 'New support ticket from :store: :subject',
        'ticket_vendor_replied' => ':store replied to the ticket: :subject',
    ],
    'customer_order' => [
        'pending' => [
            'subject' => 'We received your order #:number - :store',
            'line' => 'Thanks for ordering from :store! We received your order #:number and will review and confirm it shortly.',
        ],
        'confirmed' => [
            'subject' => 'Your order #:number is confirmed - :store',
            'line' => 'Your order #:number is confirmed and is being prepared for shipping.',
        ],
        'shipped' => [
            'subject' => 'Your order #:number is on its way - :store',
            'line' => 'Your order #:number has shipped and will reach you soon.',
        ],
        'delivered' => [
            'subject' => 'Your order #:number was delivered - :store',
            'line' => 'Your order #:number was delivered. We hope you love it, and thank you for shopping at :store.',
        ],
        'cancelled' => [
            'subject' => 'Your order #:number was cancelled - :store',
            'line' => 'We are sorry to let you know that your order #:number was cancelled.',
        ],
        'returned' => [
            'subject' => 'Your order #:number was returned - :store',
            'line' => 'The return of your order #:number has been recorded. Contact :store if you have any questions.',
        ],
        'tracking' => 'Tracking number with :carrier: :number',
        'reason' => 'Reason: :reason',
        'item' => ':name × :quantity — :total EGP',
        'total' => 'Total: :total EGP',
        'cod_reminder' => 'Please have :total EGP ready to pay on delivery.',
        'action' => 'Track your order',
    ],
    'customer_reset_password' => [
        'subject' => 'Reset your password - :store',
        'intro' => 'We received a request to reset the password of your account at :store.',
        'action' => 'Set a new password',
        'expiry' => 'This link expires in :minutes minutes and can be used only once.',
    ],
    'affiliate_reset_password' => [
        'subject' => 'Reset your password - :store',
        'intro' => 'We received a request to reset the password of your affiliate account at :store.',
        'action' => 'Set a new password',
        'expiry' => 'This link expires in :minutes minutes and can be used only once.',
    ],
    'email_verification_code' => [
        'subject' => ':code is your Sellygrow verification code',
        'intro' => 'Use this code to confirm your email address:',
        'expiry' => 'This code expires in :minutes minutes.',
        'ignore' => 'If you didn\'t try to sign up or sign in to Sellygrow, ignore this message.',
    ],
    'vendor_reset_password' => [
        'subject' => 'Reset your password - Sellygrow',
        'intro' => 'We received a request to reset the password of your Sellygrow account.',
        'action' => 'Reset password',
        'expiry' => 'This link expires in :minutes minutes.',
    ],
    'order_placed' => [
        'message' => 'New order #:number from :customer for :total EGP',
        'message_paid' => 'New order #:number from :customer for :total EGP, paid online',
        'subject' => 'New order #:number',
        'line' => 'You received a new order #:number from :customer for :total EGP.',
        'line_paid' => 'You received a new order #:number from :customer for :total EGP, paid online.',
        'action' => 'View order',
    ],
    'order_cancelled' => [
        'message' => ':customer cancelled order #:number (:total EGP)',
        'message_reason' => ':customer cancelled order #:number (:total EGP). Reason: :reason',
        'subject' => 'Order #:number was cancelled by the customer',
        'line' => ':customer cancelled order #:number for :total EGP from the store, so don\'t prepare or ship it.',
        'reason' => 'Cancellation reason: :reason',
        'action' => 'View order',
    ],
    'late_payment' => [
        'message' => 'Payment for order #:number (:total EGP) arrived after it was cancelled, refund the customer',
        'subject' => 'Payment received for cancelled order #:number',
        'line' => 'The customer paid :total EGP for order #:number after it was cancelled. Open the order to refund it or contact the customer.',
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
    'stock_out' => ':product is out of stock',
    'stock_low' => ':product is low on stock: only :stock left',
    'review_submitted' => 'New :rating/5 review from :customer on :product is waiting for your approval',
    'coupon_assigned' => [
        'percentage' => 'You have a new discount code :code: :value% off for your customers',
        'fixed' => 'You have a new discount code :code: :value EGP off for your customers',
        'free_shipping' => 'You have a new discount code :code: free shipping for your customers',
        'subject' => 'Your new discount code: :code',
        'line' => 'Share it with your followers; every order using it counts for you, even without your link.',
    ],
    'ticket_replied' => [
        'subject' => 'New reply from the support team: :subject',
        'message' => 'The support team replied to your ticket ":subject".',
    ],
    'ticket_closed' => [
        'subject' => 'Your ticket was closed: :subject',
        'message' => 'The support team closed your ticket ":subject". If you need more help, open a new ticket.',
    ],
    'ticket_reopened' => [
        'subject' => 'Your ticket was reopened: :subject',
        'message' => 'The support team reopened your ticket ":subject". You can reply to it now.',
    ],
    'ticket_action' => 'View ticket',

    'open_dashboard' => 'Open dashboard',
    'device' => ':browser on :system',
    'unknown_device' => 'Unknown device',
    'store_suspended' => [
        'subject' => 'Your store has been suspended',
        'message' => 'The platform has suspended your store, so shoppers can\'t see it and it won\'t take orders until it\'s reactivated. Reason: :reason. Contact support for details.',
    ],
    'store_reactivated' => [
        'subject' => 'Your store is back online',
        'message' => 'The platform has reactivated your store. Shoppers can see it and it takes orders again.',
    ],
    'coupon_used_up' => [
        'subject' => 'Coupon :code is used up',
        'message' => 'Coupon :code has been used as many times as allowed and no longer works in your store.',
    ],
    'coupon_expired' => [
        'subject' => 'Coupon :code has expired',
        'message' => 'Coupon :code has expired and no longer works in your store.',
    ],
    'new_sign_in' => [
        'subject' => 'New sign-in to your account',
        'message' => 'Your account was signed in from a new device (:device, IP :ip) on :time. If this wasn\'t you, change your password right away.',
    ],
    'password_changed' => [
        'subject' => 'Your password was changed',
        'message' => 'Your account password was changed from :device (IP :ip) on :time. If this wasn\'t you, reset your password right away and contact support.',
    ],
];
