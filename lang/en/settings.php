<?php

return [

    'url_invalid' => 'Enter a valid link starting with https://',
    'store_closed' => 'The store is not taking orders right now',
    'min_order_total' => 'The minimum order is :amount EGP; add :remaining EGP more',
    'policy_not_found' => 'Page not found',
    'policies' => [
        'returns' => 'Returns & exchanges',
        'shipping' => 'Shipping & delivery',
        'privacy' => 'Privacy policy',
        'terms' => 'Terms & conditions',
    ],

    'domain_invalid' => 'This domain is not valid. Type it without https, e.g. shop.example.com',
    'domain_taken' => 'This domain is connected to another store.',
    'domain_missing' => 'Add the domain first.',
    'domain_not_pointing' => 'The domain does not point to us yet. Add a CNAME record pointing to :target, then wait for it to propagate (it can take an hour).',
    'store_suspended' => 'This store is temporarily unavailable.',
    'vendor_suspended' => 'Your store has been suspended by the platform (:reason). Contact support to reactivate it.',

    'mail_test_subject' => 'Test message from :app',
    'mail_test_body' => 'The mail settings for :app are working.',
    'mail_test_sent' => 'A test message was sent to :email',
    'mail_test_logged' => 'The current provider is "Log only", so nothing was sent to :email; the message was written to storage/logs/laravel.log. Choose Amazon SES or SMTP to send for real.',
    'mail_test_failed' => 'The message could not be sent: :error',
    'vendor_email_sent' => 'The email was sent to :email',
    'vendor_email_logged' => 'The current mailer only logs, so the email to :email was written to storage/logs/laravel.log instead of being sent.',
    'vendor_email_failed' => 'The email could not be sent: :error',
    'vendor_email_no_recipients' => 'There are no active merchants with an email address to send this to.',
    'vendor_email_queued' => 'Sending to :count merchants. Follow the result in the sending history.',
];
