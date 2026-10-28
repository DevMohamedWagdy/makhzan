<?php

namespace Tests\Feature\Notifications;

use App\Listeners\EmbedMailLogo;
use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

/**
 * Every email carries the Sellygrow logo as an inline image, so it shows without the app's URL being reachable.
 */
class MailLogoTest extends TestCase
{
    use RefreshDatabase;

    public function test_sent_emails_embed_the_logo_their_header_references(): void
    {
        config(['mail.default' => 'array']);

        Vendor::factory()->unverified()->create()->notify(new EmailVerificationCodeNotification('047532', 10));

        /** @var Email $email */
        $email = Mail::mailer('array')->getSymfonyTransport()->messages()->last()->getOriginalMessage();
        $logo = collect($email->getAttachments())->first();

        $this->assertStringContainsString('cid:'.EmbedMailLogo::CONTENT_ID, $email->getHtmlBody());
        $this->assertStringContainsString('047532', $email->getHtmlBody());
        $this->assertNotNull($logo);
        $this->assertSame(EmbedMailLogo::CONTENT_ID, $logo->getName());
        $this->assertSame('image/png', $logo->getMediaType().'/'.$logo->getMediaSubtype());
    }
}
