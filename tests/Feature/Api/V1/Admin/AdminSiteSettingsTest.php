<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admins manage the public website's contact channels and legal pages from the panel.
 */
class AdminSiteSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_nothing_is_set_until_the_admin_saves(): void
    {
        $this->getJson('/api/v1/admin/settings/site')
            ->assertOk()
            ->assertExactJson(['data' => [
                'whatsapp' => null, 'contact_email' => null,
                'terms_ar' => null, 'terms_en' => null, 'privacy_ar' => null, 'privacy_en' => null,
                'terms_updated_at' => null, 'privacy_updated_at' => null,
            ]]);
    }

    public function test_saves_the_contact_channels_and_keeps_only_the_whatsapp_digits(): void
    {
        $this->putJson('/api/v1/admin/settings/site', ['whatsapp' => '+20 100-123-4567', 'contact_email' => 'hello@sellygrow.com'])
            ->assertOk()
            ->assertJsonPath('data.whatsapp', '201001234567')
            ->assertJsonPath('data.contact_email', 'hello@sellygrow.com');

        $this->getJson('/api/v1/site/contact')->assertExactJson(['data' => ['whatsapp' => '201001234567', 'contact_email' => 'hello@sellygrow.com']]);
    }

    public function test_a_legal_pages_date_moves_only_when_its_text_changes(): void
    {
        $this->travelTo('2026-10-01 10:00');
        $this->putJson('/api/v1/admin/settings/site', ['terms_ar' => 'الشروط', 'privacy_ar' => 'الخصوصية'])->assertOk();

        $this->travelTo('2026-10-20 10:00');
        $this->putJson('/api/v1/admin/settings/site', ['terms_ar' => 'الشروط المعدلة', 'privacy_ar' => 'الخصوصية'])
            ->assertOk()
            ->assertJsonPath('data.terms_updated_at', '2026-10-20T10:00:00+00:00')
            ->assertJsonPath('data.privacy_updated_at', '2026-10-01T10:00:00+00:00');
    }

    public function test_rejects_an_invalid_whatsapp_number_and_email(): void
    {
        $this->putJson('/api/v1/admin/settings/site', ['whatsapp' => 'call me', 'contact_email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['whatsapp', 'contact_email']);
    }

    public function test_settings_need_their_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['settings.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/settings/site')->assertOk();
        $this->putJson('/api/v1/admin/settings/site', ['contact_email' => 'hello@sellygrow.com'])->assertForbidden();
    }
}
