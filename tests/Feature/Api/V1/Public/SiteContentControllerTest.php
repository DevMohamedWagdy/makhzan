<?php

namespace Tests\Feature\Api\V1\Public;

use App\Support\SiteSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteContentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_channels_are_public_and_empty_until_set(): void
    {
        $this->getJson('/api/v1/site/contact')->assertOk()->assertExactJson(['data' => ['whatsapp' => null, 'contact_email' => null]]);
    }

    public function test_a_legal_page_comes_in_the_requested_language(): void
    {
        $this->travelTo('2026-10-20 10:00');
        SiteSettings::update(['terms_ar' => 'الشروط والأحكام', 'terms_en' => 'Terms and conditions']);

        $this->getJson('/api/v1/site/legal/terms', ['Accept-Language' => 'ar'])
            ->assertOk()
            ->assertExactJson(['data' => ['content' => 'الشروط والأحكام', 'updated_at' => '2026-10-20T10:00:00+00:00']]);

        $this->getJson('/api/v1/site/legal/terms', ['Accept-Language' => 'en'])->assertJsonPath('data.content', 'Terms and conditions');
    }

    public function test_a_legal_page_without_saved_text_returns_no_content(): void
    {
        SiteSettings::update(['privacy_ar' => 'سياسة الخصوصية']);

        $this->getJson('/api/v1/site/legal/privacy', ['Accept-Language' => 'en'])
            ->assertOk()
            ->assertExactJson(['data' => ['content' => null, 'updated_at' => null]]);
    }

    public function test_only_the_known_legal_pages_exist(): void
    {
        $this->getJson('/api/v1/site/legal/refunds')->assertNotFound();
    }
}
