<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Store;
use App\Models\Vendor;
use App\Support\DomainVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class CustomDomainTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        config(['makhzan.custom_domains.cname_target' => 'stores.makhzan.app']);
        $this->vendor = $this->actingAsVendor();
    }

    private function verifierReturns(bool $pointsToUs): void
    {
        $this->mock(DomainVerifier::class, fn (MockInterface $mock) => $mock->shouldReceive('pointsToUs')->andReturn($pointsToUs));
    }

    public function test_saves_a_normalized_domain_and_verifies_its_dns(): void
    {
        $this->putJson('/api/v1/vendor/store/domain', ['domain' => 'https://Shop.Noor.com/'])
            ->assertOk()
            ->assertJsonPath('data.domain', 'shop.noor.com')
            ->assertJsonPath('data.verified_at', null)
            ->assertJsonPath('data.cname_target', 'stores.makhzan.app');

        $this->verifierReturns(false);
        $this->postJson('/api/v1/vendor/store/domain/verify')->assertJsonValidationErrors('domain');

        $this->verifierReturns(true);
        $this->postJson('/api/v1/vendor/store/domain/verify')->assertOk()->assertJsonPath('data.domain', 'shop.noor.com');

        $store = $this->vendor->store->fresh();
        $this->assertNotNull($store->custom_domain_verified_at);
        $this->assertSame('https://shop.noor.com/?ref=AB', $store->storefrontUrl('?ref=AB'));
    }

    public function test_rejects_invalid_taken_and_platform_domains(): void
    {
        Store::factory()->create(['custom_domain' => 'taken.com']);
        config(['app.url' => 'https://makhzan.app']);

        foreach (['not a domain', 'taken.com', 'makhzan.app'] as $domain) {
            $this->putJson('/api/v1/vendor/store/domain', ['domain' => $domain])->assertJsonValidationErrors('domain');
        }
    }

    public function test_a_verified_domain_serves_its_storefront_and_unknown_domains_404(): void
    {
        $this->vendor->store->forceFill(['custom_domain' => 'shop.noor.com', 'custom_domain_verified_at' => now()])->save();

        $this->get('http://shop.noor.com/products')
            ->assertOk()
            ->assertSee("window.__MAKHZAN_STORE_DOMAIN__ = '{$this->vendor->store->slug}'", false);

        $this->get('http://unknown-shop.com/')->assertNotFound();
        $this->get('http://localhost/dashboard')->assertOk()->assertDontSee('__MAKHZAN_STORE_DOMAIN__');
    }

    public function test_an_unverified_or_suspended_domain_is_not_served(): void
    {
        $this->vendor->store->forceFill(['custom_domain' => 'shop.noor.com'])->save();
        $this->get('http://shop.noor.com/')->assertNotFound();

        $this->vendor->store->forceFill(['custom_domain_verified_at' => now(), 'suspended_at' => now()])->save();
        $this->get('http://shop.noor.com/')->assertNotFound();
    }
}
