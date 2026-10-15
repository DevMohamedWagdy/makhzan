<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class StoreSlugAvailabilityControllerTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['noor-fashion', false])]
    #[TestWith(['admin', false])]
    #[TestWith(['terms', false])]
    #[TestWith(['privacy', false])]
    #[TestWith(['fresh-store', true])]
    public function test_reports_slug_availability(string $slug, bool $available): void
    {
        Store::factory()->create(['slug' => 'noor-fashion']);

        $this->getJson('/api/v1/stores/slug-availability?slug='.$slug)
            ->assertOk()
            ->assertExactJson(['slug' => $slug, 'available' => $available]);
    }
}
