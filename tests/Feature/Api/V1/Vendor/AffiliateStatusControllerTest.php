<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliateStatusControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_freezing_keeps_history_disables_codes_and_revokes_affiliate_tokens(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->withSales(40)->create();
        $affiliate->createToken('affiliate-app');

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'frozen', 'reason' => 'مخالفة سياسة الإعلانات'])
            ->assertOk()
            ->assertJsonPath('data.status', 'frozen')
            ->assertJsonPath('data.frozen_reason', 'مخالفة سياسة الإعلانات')
            ->assertJsonPath('data.referral_codes.0.is_active', false)
            ->assertJsonPath('data.stats.orders_count', 40);

        $this->assertSame(0, $affiliate->tokens()->count());
        $this->assertNotNull($affiliate->fresh()->frozen_at);
    }

    public function test_activating_a_frozen_affiliate_reenables_codes_and_clears_reason(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->frozen()->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.frozen_reason', null)
            ->assertJsonPath('data.referral_codes.0.is_active', true);
    }

    public function test_approving_a_pending_applicant_creates_its_first_referral_code(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonCount(1, 'data.referral_codes');

        $this->assertSame(AffiliateStatus::Active, $affiliate->fresh()->status);
    }

    public function test_freezing_a_pending_applicant_returns_422(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'frozen'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'لا يمكن تجميد طلب انضمام لم تتم الموافقة عليه بعد']);
    }

    public function test_setting_status_to_pending_is_rejected(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'pending'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'حالة غير صالحة']);
    }

    public function test_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$foreign->id}/status", ['status' => 'frozen'])->assertNotFound();
        $this->assertSame(AffiliateStatus::Active, $foreign->fresh()->status);
    }
}
