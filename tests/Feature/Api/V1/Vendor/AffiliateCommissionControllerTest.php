<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\CommissionType;
use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AffiliateCommissionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sets_a_custom_percentage_commission(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}/commission", [
            'use_tier_default' => false,
            'type' => 'percentage',
            'value' => 15,
            'note' => 'اتفاق خاص لموسم رمضان',
        ])->assertOk()->assertJsonPath('data.commission_override', ['type' => 'percentage', 'value' => 15, 'note' => 'اتفاق خاص لموسم رمضان']);
    }

    public function test_reverting_to_tier_default_clears_the_override(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->withCustomCommission()->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}/commission", ['use_tier_default' => true, 'type' => 'percentage', 'value' => 15])
            ->assertOk()
            ->assertJsonPath('data.commission_override', null);

        $this->assertSame(8.0, $affiliate->fresh()->effectiveCommission()['value']);
    }

    #[TestWith(['percentage', 60, 'أدخل نسبة بين 0.5% و 50%'])]
    #[TestWith(['fixed', 0.5, 'أدخل مبلغاً بين 1 و 5000 ج.م'])]
    public function test_rejects_values_outside_the_types_range(string $type, float $value, string $message): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}/commission", ['use_tier_default' => false, 'type' => $type, 'value' => $value])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['value' => $message]);
    }

    public function test_custom_commission_requires_type_and_value(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}/commission", ['use_tier_default' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['type' => 'اختر نوع العمولة', 'value' => 'أدخل قيمة العمولة']);
    }

    public function test_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->putJson("/api/v1/vendor/affiliates/{$foreign->id}/commission", ['use_tier_default' => false, 'type' => 'fixed', 'value' => 50])->assertNotFound();
        $this->assertNotSame(CommissionType::Fixed, $foreign->fresh()->commission_type);
    }
}
