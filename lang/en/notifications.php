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
        'subscription_requested' => 'New subscription request from :store for :plan (:amount EGP)',
        'trial_ended' => 'The trial of :store ended without a subscription',
    ],
    'subscription_activated' => [
        'subject' => 'Your :plan plan is active',
        'message' => 'The :plan plan is now active for your store until :date. Thank you for choosing Makhzan!',
    ],
    'subscription_rejected' => [
        'subject' => 'We could not activate the :plan plan',
        'message' => 'We could not confirm the payment for your :plan plan request. Check the transfer details and send the request again.',
    ],
    'subscription_expiring' => [
        'subject' => 'Your :plan plan ends soon',
        'message' => 'Your store\'s :plan plan ends on :date. Renew so its features keep working.',
    ],
    'trial_ending' => [
        'subject' => 'Your trial ends soon',
        'message' => 'Your store\'s trial ends on :date. Choose a plan now so your store keeps taking orders.',
    ],
    'subscription_note' => 'Note: :note',
    'subscription_action' => 'Manage subscription',
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
        'tracking_link' => 'Track your shipment: :url',
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
    'vendor_reset_password' => [
        'subject' => 'Reset your password - Makhzan',
        'intro' => 'We received a request to reset the password of your Makhzan account.',
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

];
