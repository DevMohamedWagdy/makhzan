<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;

/**
 * Attaches the Sellygrow logo inline to every email whose template asks for it (the mail header's
 * <img src="cid:sellygrow-logo">). An inline image shows in every client without loading anything
 * from the app's own URL, which Gmail can't reach on a local or private host.
 */
class EmbedMailLogo
{
    public const CONTENT_ID = 'sellygrow-logo';

    public function handle(MessageSending $event): void
    {
        $html = $event->message->getHtmlBody();

        if (is_string($html) && str_contains($html, 'cid:'.self::CONTENT_ID)) {
            $event->message->embedFromPath(public_path('brand/email/logo.png'), self::CONTENT_ID, 'image/png');
        }
    }
}
