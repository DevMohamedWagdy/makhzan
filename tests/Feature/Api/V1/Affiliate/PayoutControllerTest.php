<?php

namespace Tests\Feature\Api\V1\Affiliate;

use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use App\Notifications\AffiliatePayoutRequestedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PayoutControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/affiliate/payouts';

    public function test_requests_a_transfer_and_notifies_the_vendor(): void
    {
        Notification::fake();
        $affiliate = Affiliate::factory()->create(['pending_balance' => 900]);

        $this->withToken($affiliate->issueToken(remember: false))
            ->postJson(self::URL, ['amount' => 900, 'note' => 'محتاج التحويل قبل الخميس'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'requested')
            ->assertJsonPath('data.amount', 900)
            ->assertJsonPath('data.request_note', 'محتاج التحويل قبل الخميس');

        $this->assertSame(PayoutStatus::Requested, $affiliate->payouts()->sole()->status);
        $this->assertSame(900.0, $affiliate->fresh()->pending_balance);
        Notification::assertSentTo($affiliate->vendor, AffiliatePayoutRequestedNotification::class);
    }

    public function test_the_open_request_shows_on_the_dashboard(): void
    {
        $affiliate = Affiliate::factory()->create(['pending_balance' => 900]);
        $request = AffiliatePayout::factory()->for($affiliate)->requested()->create(['amount' => 600]);

        $this->withToken($affiliate->issueToken(remember: false))
            ->getJson('/api/v1/affiliate/auth/me')
            ->assertOk()
            ->assertJsonPath('data.payout_request.payout_id', $request->id)
            ->assertJsonPath('data.payout_request.amount', 600);
    }

    public function test_cannot_request_more_than_the_pending_balance(): void
    {
        Notification::fake();
        $affiliate = Affiliate::factory()->create(['pending_balance' => 100]);

        $this->withToken($affiliate->issueToken(remember: false))
            ->postJson(self::URL, ['amount' => 150])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'المبلغ أكبر من الرصيد المعلق']);

        Notification::assertNothingSent();
    }

    public function test_only_one_request_can_be_open_at_a_time(): void
    {
        $affiliate = Affiliate::factory()->create(['pending_balance' => 1000]);
        AffiliatePayout::factory()->for($affiliate)->requested()->create(['amount' => 300]);

        $this->withToken($affiliate->issueToken(remember: false))
            ->postJson(self::URL, ['amount' => 200])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'لديك طلب تحويل قيد المراجعة بالفعل']);
    }

    public function test_vendor_impersonation_token_cannot_request_a_transfer(): void
    {
        $affiliate = Affiliate::factory()->create(['pending_balance' => 1000]);
        $token = $affiliate->createToken('impersonation', [Affiliate::IMPERSONATION_ABILITY])->plainTextToken;

        $this->withToken($token)->postJson(self::URL, ['amount' => 200])->assertForbidden();
        $this->assertSame(0, $affiliate->payouts()->count());
    }

    public function test_lists_only_the_affiliates_own_payouts(): void
    {
        $affiliate = Affiliate::factory()->create();
        $own = AffiliatePayout::factory()->for($affiliate)->create(['amount' => 700]);
        AffiliatePayout::factory()->create();

        $this->withToken($affiliate->issueToken(remember: false))
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.*.payout_id', [$own->id])
            ->assertJsonPath('summary.total_paid', 700);
    }
}
