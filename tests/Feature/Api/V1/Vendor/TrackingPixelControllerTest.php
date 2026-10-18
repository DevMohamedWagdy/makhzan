<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\TrackingProvider;
use App\Models\StoreTrackingPixel;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingPixelControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    public function test_connects_platforms_without_ever_returning_the_access_token(): void
    {
        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => [
            'meta' => ['pixel_id' => ' 123456789012345 ', 'access_token' => 'EAAGsecret-token-9876', 'test_event_code' => 'TEST123'],
            'tiktok' => ['pixel_id' => 'c5abcdefghijklmnop12'],
            'google' => ['pixel_id' => 'g-ab12cd34ef', 'access_token' => 'ga-api-secret'],
        ]])
            ->assertOk()
            ->assertJsonPath('data.pixels.meta.pixel_id', '123456789012345')
            ->assertJsonPath('data.pixels.meta.has_access_token', true)
            ->assertJsonPath('data.pixels.meta.access_token_hint', '••••9876')
            ->assertJsonPath('data.pixels.meta.test_event_code', 'TEST123')
            ->assertJsonPath('data.pixels.tiktok.pixel_id', 'C5ABCDEFGHIJKLMNOP12')
            ->assertJsonPath('data.pixels.tiktok.has_access_token', false)
            ->assertJsonPath('data.pixels.google.pixel_id', 'G-AB12CD34EF')
            ->assertJsonMissingPath('data.pixels.meta.access_token');

        $this->assertStringNotContainsString('EAAGsecret', $this->getJson('/api/v1/vendor/tracking-pixels')->getContent());
        $this->assertSame('EAAGsecret-token-9876', StoreTrackingPixel::query()->where('provider', 'meta')->sole()->access_token);
    }

    public function test_a_blank_token_keeps_the_saved_one_and_an_empty_id_disconnects(): void
    {
        $pixel = $this->vendor->store->trackingPixels()->create(['provider' => TrackingProvider::Meta, 'pixel_id' => '123456789012345', 'access_token' => 'saved-token']);
        $pixel->forceFill(['last_error' => 'old error', 'last_error_at' => now()])->save();

        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => ['meta' => ['pixel_id' => '123456789012345', 'access_token' => '', 'is_active' => false]]])
            ->assertOk()
            ->assertJsonPath('data.pixels.meta.is_active', false)
            ->assertJsonPath('data.pixels.meta.last_error', 'old error');
        $this->assertSame('saved-token', $pixel->fresh()->access_token);

        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => ['meta' => ['pixel_id' => '999999999999999']]])->assertJsonPath('data.pixels.meta.last_error', null);

        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => ['meta' => ['pixel_id' => '']]])->assertOk()->assertJsonPath('data.pixels.meta', null);
        $this->assertModelMissing($pixel);
    }

    public function test_validates_pixel_ids_per_platform(): void
    {
        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => [
            'meta' => ['pixel_id' => 'abc'],
            'google' => ['pixel_id' => 'UA-12345-1'],
        ]])->assertJsonValidationErrors(['pixels.meta.pixel_id', 'pixels.google.pixel_id']);

        $this->putJson('/api/v1/vendor/tracking-pixels', ['pixels' => ['snapchat' => ['pixel_id' => '1']]])->assertJsonValidationErrors('pixels');
    }

    public function test_the_storefront_gets_active_pixel_ids_only(): void
    {
        $store = $this->vendor->store;
        $store->trackingPixels()->create(['provider' => TrackingProvider::Meta, 'pixel_id' => '123456789012345', 'access_token' => 'secret-token']);
        $store->trackingPixels()->create(['provider' => TrackingProvider::Tiktok, 'pixel_id' => 'C5ABCDEFGHIJKLMNOP12', 'is_active' => false]);

        $response = $this->getJson("/api/v1/storefront/{$store->slug}")
            ->assertOk()
            ->assertJsonPath('store.tracking_pixels', ['meta' => '123456789012345']);

        $this->assertStringNotContainsString('secret-token', $response->getContent());
    }
}
