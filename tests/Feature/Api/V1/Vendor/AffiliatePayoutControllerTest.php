<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\PayoutMethod;
use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliatePayoutControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_records_a_payout_and_deducts_it_from_the_pending_balance(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create([
            'pending_balance' => 1500,
            'payout_type' => PayoutMethod::InstaPay,
            'payout_account_name' => 'سارة محمود',
            'payout_account_number' => '01011112233',
        ]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", [
            'amount' => 1000,
            'reference' => 'TRX123',
            'note' => 'عمولات سبتمبر',
        ])->assertCreated()->assertJsonPath('data.stats.pending_balance', 500)->assertJsonPath('data.payout_request', null);

        $payout = $affiliate->payouts()->sole();
        $this->assertSame(PayoutStatus::Paid, $payout->status);
        $this->assertSame(1000.0, $payout->amount);
        $this->assertSame(PayoutMethod::InstaPay, $payout->payout_type);
        $this->assertSame('2233', $payout->payout_account_last4);
        $this->assertSame('TRX123', $payout->reference);
        $this->assertNotNull($payout->paid_at);
    }

    public function test_rejects_an_amount_above_the_pending_balance(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['pending_balance' => 300]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 300.01])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'المبلغ أكبر من الرصيد المعلق']);

        $this->assertSame(300.0, $affiliate->fresh()->pending_balance);
        $this->assertSame(0, $affiliate->payouts()->count());
    }

    public function test_paying_fulfils_the_open_transfer_request(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['pending_balance' => 800]);
        $request = AffiliatePayout::factory()->for($affiliate)->requested()->create(['amount' => 800]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 800, 'reference' => 'TRX9'])
            ->assertCreated()
            ->assertJsonPath('data.payout_request', null);

        $this->assertSame(1, $affiliate->payouts()->count());
        $this->assertSame(PayoutStatus::Paid, $request->fresh()->status);
        $this->assertSame('أرجو تحويل رصيدي', $request->fresh()->request_note);
        $this->assertSame(0.0, $affiliate->fresh()->pending_balance);
    }

    public function test_cannot_pay_an_applicant_awaiting_approval(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create(['pending_balance' => 100]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 50])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'لا يمكن تسجيل دفعة لمسوق لم تتم الموافقة عليه بعد']);
    }

    public function test_rejects_a_future_payment_date(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['pending_balance' => 100]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 50, 'paid_at' => now()->addDay()->toDateString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['paid_at' => 'تاريخ التحويل لا يمكن أن يكون في المستقبل']);
    }

    public function test_lists_payouts_newest_first_with_the_total_paid(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();
        $older = AffiliatePayout::factory()->for($affiliate)->create(['amount' => 400]);
        $newer = AffiliatePayout::factory()->for($affiliate)->create(['amount' => 250]);
        $rejected = AffiliatePayout::factory()->for($affiliate)->rejected()->create(['amount' => 999]);
        AffiliatePayout::factory()->create();

        $this->getJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts")
            ->assertOk()
            ->assertJsonPath('data.*.payout_id', [$rejected->id, $newer->id, $older->id])
            ->assertJsonPath('summary.total_paid', 650);
    }

    public function test_rejecting_a_request_keeps_the_balance(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['pending_balance' => 500]);
        $request = AffiliatePayout::factory()->for($affiliate)->requested()->create(['amount' => 500]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts/{$request->id}/reject", ['note' => 'التحويل يوم 1 من كل شهر'])
            ->assertOk()
            ->assertJsonPath('data.payout_request', null)
            ->assertJsonPath('data.stats.pending_balance', 500);

        $this->assertSame(PayoutStatus::Rejected, $request->fresh()->status);
        $this->assertSame('التحويل يوم 1 من كل شهر', $request->fresh()->note);
    }

    public function test_cannot_reject_a_payout_that_is_already_paid(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();
        $paid = AffiliatePayout::factory()->for($affiliate)->create();

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts/{$paid->id}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payout' => 'تمت معالجة هذا الطلب بالفعل']);
    }

    public function test_cannot_reject_another_affiliates_request(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();
        $otherRequest = AffiliatePayout::factory()->requested()->create();

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts/{$otherRequest->id}/reject")->assertNotFound();
        $this->assertSame(PayoutStatus::Requested, $otherRequest->fresh()->status);
    }

    public function test_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create(['pending_balance' => 500]);

        $this->getJson("/api/v1/vendor/affiliates/{$foreign->id}/payouts")->assertNotFound();
        $this->postJson("/api/v1/vendor/affiliates/{$foreign->id}/payouts", ['amount' => 100])->assertNotFound();
        $this->assertSame(500.0, $foreign->fresh()->pending_balance);
    }
}
