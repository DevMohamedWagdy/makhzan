<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admins set the platform's sender and SMTP server from the panel.
 */
class AdminMailSettingsTest extends TestCase
{
    use RefreshDatabase;

    private const SMTP_SETTINGS = [
        'from_address' => 'no-reply@sellygrow.com',
        'from_name' => 'Sellygrow',
        'smtp_host' => 'email-smtp.eu-north-1.amazonaws.com',
        'smtp_port' => 587,
        'smtp_username' => 'example-user',
        'smtp_password' => 'example-secret',
        'smtp_encryption' => 'tls',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_saved_settings_drive_the_mail_config_and_secrets_stay_on_the_server(): void
    {
        $this->putJson('/api/v1/admin/settings/mail', self::SMTP_SETTINGS)
            ->assertOk()
            ->assertJsonPath('data.smtp_host', 'email-smtp.eu-north-1.amazonaws.com')
            ->assertJsonPath('data.smtp_port', 587)
            ->assertJsonPath('data.has_smtp_password', true)
            ->assertJsonMissingPath('data.smtp_password');

        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('no-reply@sellygrow.com', config('mail.from.address'));
        $this->assertSame('example-secret', config('mail.mailers.smtp.password'));
        $this->assertStringNotContainsString('example-secret', PlatformSetting::query()->getQuery()->value('value'));

        // A blank password keeps the saved one.
        $this->putJson('/api/v1/admin/settings/mail', [...self::SMTP_SETTINGS, 'smtp_password' => '', 'from_name' => 'Sellygrow Team'])->assertOk();
        $this->assertSame('example-secret', PlatformSetting::valueOf('mail')['smtp_password']);
        $this->getJson('/api/v1/admin/settings/mail')->assertOk()->assertJsonPath('data.from_name', 'Sellygrow Team');
    }

    public function test_settings_need_an_smtp_server(): void
    {
        $this->putJson('/api/v1/admin/settings/mail', ['from_address' => 'no-reply@sellygrow.com', 'from_name' => 'Sellygrow'])
            ->assertJsonValidationErrors(['smtp_host', 'smtp_port']);
    }

    public function test_settings_saved_before_ses_was_removed_switch_to_smtp_and_drop_the_ses_keys(): void
    {
        PlatformSetting::query()->create(['key' => 'mail', 'value' => ['mailer' => 'ses', 'ses_key' => 'AKIAEXAMPLEKEY', 'ses_secret' => 'old-secret', 'from_name' => 'Sellygrow']]);

        $this->putJson('/api/v1/admin/settings/mail', self::SMTP_SETTINGS)->assertOk();

        $this->assertSame('smtp', config('mail.default'));
        $this->assertEqualsCanonicalizing(array_keys(self::SMTP_SETTINGS), array_keys(PlatformSetting::valueOf('mail')));
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
        $this->putJson('/api/v1/admin/settings/mail', self::SMTP_SETTINGS)->assertForbidden();
    }
}
