<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayoutControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_the_stores_payouts_with_their_affiliates_and_status_counts(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliates = Affiliate::factory()->for($vendor)->for($vendor->store);
        $paid = AffiliatePayout::factory()->for($affiliates->create())->create();
        $request = AffiliatePayout::factory()->for($affiliates->create(['full_name' => 'سارة محمود']))->requested()->create();
        AffiliatePayout::factory()->for($affiliates->create())->rejected()->create();
        AffiliatePayout::factory()->requested()->create();

        $this->getJson('/api/v1/vendor/payouts')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('summary', ['requested' => 1, 'paid' => 1, 'rejected' => 1]);

        $this->getJson('/api/v1/vendor/payouts?status=requested')
            ->assertOk()
            ->assertJsonPath('data.*.payout_id', [$request->id])
            ->assertJsonPath('data.0.affiliate.full_name', 'سارة محمود')
            ->assertJsonPath('data.0.affiliate.payout_request.payout_id', $request->id);

        $this->getJson('/api/v1/vendor/payouts?status=paid')->assertJsonPath('data.*.payout_id', [$paid->id]);
    }

    public function test_rejects_an_unknown_status(): void
    {
        $this->actingAsVendor();

        $this->getJson('/api/v1/vendor/payouts?status=lost')->assertUnprocessable()->assertJsonValidationErrors('status');
    }
}
