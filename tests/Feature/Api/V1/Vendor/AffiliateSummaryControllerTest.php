<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliateSummaryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_counts_and_totals_for_the_vendors_store_only(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliates = Affiliate::factory()->for($vendor)->for($vendor->store);
        [$requesting] = $affiliates->count(2)->create(['sales_total' => 1000, 'earned_commission' => 80]);
        $affiliates->frozen()->create(['sales_total' => 500, 'earned_commission' => 40]);
        $affiliates->pending()->create();
        AffiliatePayout::factory()->for($requesting)->requested()->create();
        AffiliatePayout::factory()->for($requesting)->create();
        AffiliatePayout::factory()->requested()->create();
        Affiliate::factory()->create(['sales_total' => 99999]);

        $this->getJson('/api/v1/vendor/affiliates/summary')->assertOk()->assertExactJson([
            'total' => 4,
            'active' => 2,
            'frozen' => 1,
            'pending' => 1,
            'sales_total' => 2500,
            'earned_commission' => 200,
            'payout_requests' => 1,
        ]);
    }

    public function test_returns_zeros_for_a_store_without_affiliates(): void
    {
        $this->actingAsVendor();

        $this->getJson('/api/v1/vendor/affiliates/summary')
            ->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonPath('sales_total', 0);
    }
}
