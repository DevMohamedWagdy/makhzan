<?php

namespace Tests\Feature;

use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_platform_home_page_has_search_and_share_meta_tags(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<meta name="description"', false)
            ->assertSee('<meta property="og:title"', false)
            ->assertSee('<link rel="canonical" href="'.url('/').'"', false);
    }

    public function test_the_terms_and_privacy_pages_are_served(): void
    {
        $this->get('/terms')->assertOk()->assertSee('<link rel="canonical" href="'.url('/terms').'"', false);
        $this->get('/privacy')->assertOk()->assertSee('<link rel="canonical" href="'.url('/privacy').'"', false);
    }

    public function test_a_store_domain_gets_the_stores_meta_tags_instead_of_the_platforms(): void
    {
        Store::factory()->create(['name' => 'نور للأزياء', 'custom_domain' => 'shop.noor.com', 'custom_domain_verified_at' => now()]);

        $this->get('http://shop.noor.com/')
            ->assertOk()
            ->assertSee('__MAKHZAN_STORE_DOMAIN__')
            ->assertSee('<meta property="og:title" content="نور للأزياء">', false)
            ->assertDontSee('Sellygrow |');
    }
}
