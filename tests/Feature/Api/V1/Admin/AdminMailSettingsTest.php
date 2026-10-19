<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admins choose the platform's mail provider and credentials from the panel.
 */
class AdminMailSettingsTest extends TestCase
{
    use RefreshDatabase;

    private const SES_SETTINGS = [
        'mailer' => 'ses',
        'from_address' => 'no-reply@sellygrow.com',
        'from_name' => 'Sellygrow',
        'ses_key' => 'AKIAEXAMPLEKEY',
        'ses_secret' => 'example-secret',
        'ses_region' => 'eu-north-1',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_saved_settings_drive_the_mail_config_and_secrets_stay_on_the_server(): void
    {
        $this->putJson('/api/v1/admin/settings/mail', self::SES_SETTINGS)
            ->assertOk()
            ->assertJsonPath('data.mailer', 'ses')
            ->assertJsonPath('data.ses_region', 'eu-north-1')
            ->assertJsonPath('data.has_ses_secret', true)
            ->assertJsonMissingPath('data.ses_secret');

        $this->assertSame('ses', config('mail.default'));
        $this->assertSame('no-reply@sellygrow.com', config('mail.from.address'));
        $this->assertSame('example-secret', config('services.ses.secret'));
        $this->assertStringNotContainsString('example-secret', PlatformSetting::query()->getQuery()->value('value'));

        // A blank secret keeps the saved one.
        $this->putJson('/api/v1/admin/settings/mail', [...self::SES_SETTINGS, 'ses_secret' => '', 'from_name' => 'Sellygrow Team'])->assertOk();
        $this->assertSame('example-secret', PlatformSetting::valueOf('mail')['ses_secret']);
        $this->getJson('/api/v1/admin/settings/mail')->assertOk()->assertJsonPath('data.from_name', 'Sellygrow Team');
    }

    public function test_ses_needs_its_credentials(): void
    {
        $this->putJson('/api/v1/admin/settings/mail', ['mailer' => 'ses', 'from_address' => 'no-reply@sellygrow.com', 'from_name' => 'Sellygrow'])
            ->assertJsonValidationErrors(['ses_key', 'ses_region']);

        $this->putJson('/api/v1/admin/settings/mail', [...self::SES_SETTINGS, 'mailer' => 'log'])->assertJsonValidationErrors('mailer');

        $this->putJson('/api/v1/admin/settings/mail', [...self::SES_SETTINGS, 'ses_secret' => null])
            ->assertJsonValidationErrors(['ses_secret' => 'أدخل Secret access key الخاص بـ Amazon SES.']);
    }

    public function test_a_test_message_goes_out_with_the_current_settings(): void
    {
        Mail::fake();
        config(['mail.default' => 'smtp']);

        $this->postJson('/api/v1/admin/settings/mail/test', ['email' => 'owner@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'تم إرسال رسالة تجريبية إلى owner@example.com');

        config(['mail.default' => 'log']);
        $this->postJson('/api/v1/admin/settings/mail/test', ['email' => 'owner@example.com'])
            ->assertOk()
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'سجل فقط'));
    }

    public function test_settings_need_their_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['overview.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/settings/mail')->assertForbidden();
        $this->putJson('/api/v1/admin/settings/mail', self::SES_SETTINGS)->assertForbidden();
    }
}
