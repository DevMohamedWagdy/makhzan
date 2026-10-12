<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliateReferralCodeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_an_additional_unique_code_for_an_active_affiliate(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $response = $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/referral-codes")
            ->assertCreated()
            ->assertJsonCount(2, 'data.referral_codes');

        $codes = collect($response->json('data.referral_codes'))->pluck('code');
        $this->assertCount(2, $codes->unique());
    }

    public function test_returns_422_for_a_frozen_affiliate(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->frozen()->create();

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/referral-codes")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['affiliate' => 'لا يمكن إنشاء كود لمسوق غير نشط']);
    }

    public function test_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->postJson("/api/v1/vendor/affiliates/{$foreign->id}/referral-codes")->assertNotFound();
    }
}
