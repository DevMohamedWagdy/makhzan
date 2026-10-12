<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\AffiliateRegistrationLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliateRegistrationLinkControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/vendor/affiliates/registration-link';

    public function test_show_creates_the_default_link_on_first_read_and_returns_200(): void
    {
        $vendor = $this->actingAsVendor();

        $response = $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.is_enabled', true)
            ->assertJsonPath('data.auto_approve', false)
            ->assertJsonPath('data.default_tier', 'new');

        $token = $response->json('data.token');
        $this->assertSame("https://makhzan.app/{$vendor->store->slug}/affiliates/join?t={$token}", $response->json('data.url'));
        $this->assertSame($token, $this->getJson(self::URL)->json('data.token'));
    }

    public function test_update_changes_only_the_given_settings(): void
    {
        $vendor = $this->actingAsVendor();
        AffiliateRegistrationLink::factory()->for($vendor->store)->create();

        $this->patchJson(self::URL, ['auto_approve' => true, 'default_tier' => 'general'])
            ->assertOk()
            ->assertJsonPath('data.auto_approve', true)
            ->assertJsonPath('data.default_tier', 'general')
            ->assertJsonPath('data.is_enabled', true);
    }

    public function test_update_rejects_unknown_tier(): void
    {
        $this->actingAsVendor();

        $this->patchJson(self::URL, ['default_tier' => 'gold'])->assertUnprocessable()->assertJsonValidationErrors('default_tier');
    }

    public function test_regenerate_replaces_the_token(): void
    {
        $vendor = $this->actingAsVendor();
        $link = AffiliateRegistrationLink::factory()->for($vendor->store)->create();

        $this->postJson(self::URL.'/regenerate')
            ->assertOk()
            ->assertJsonMissing(['token' => $link->token]);

        $this->assertNotSame($link->token, $link->fresh()->token);
    }

    public function test_each_vendor_sees_only_their_own_link(): void
    {
        $other = AffiliateRegistrationLink::factory()->create();
        $this->actingAsVendor();

        $this->getJson(self::URL)->assertOk()->assertJsonMissing(['token' => $other->token]);
    }
}
