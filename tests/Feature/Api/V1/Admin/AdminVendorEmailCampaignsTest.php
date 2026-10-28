<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\Store;
use App\Models\Vendor;
use App\Models\VendorEmailCampaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The platform team emails all merchants or the ones picked, then follows the result in the history.
 */
class AdminVendorEmailCampaignsTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $first;

    private Vendor $second;

    private Vendor $inactive;

    private Vendor $staff;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mail.default' => 'array']);
        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);

        $this->first = Vendor::factory()->withStore()->create(['email' => 'first@example.com']);
        $this->second = Vendor::factory()->withStore()->create(['email' => 'second@example.com']);
        $this->inactive = Vendor::factory()->withStore()->create(['email' => 'off@example.com', 'is_active' => false]);
        $this->staff = Vendor::factory()->create(['email' => 'staff@example.com', 'store_id' => Store::query()->value('id')]);
    }

    /**
     * @return list<string>
     */
    private function recipients(): array
    {
        return Mail::mailer('array')->getSymfonyTransport()->messages()
            ->map(fn ($sent): string => $sent->getOriginalMessage()->getTo()[0]->getAddress())
            ->sort()->values()->all();
    }

    public function test_an_email_to_all_reaches_every_active_store_owner(): void
    {
        $this->postJson('/api/v1/admin/vendor-emails', ['audience' => 'all', 'subject' => 'تحديث مهم', 'body' => 'نص الرسالة'])
            ->assertCreated()
            ->assertJsonPath('data.recipients_count', 2)
            ->assertJsonPath('message', 'جارٍ إرسال الرسالة إلى 2 تاجر. تابع النتيجة في سجل الإرسال.');

        $this->assertSame(['first@example.com', 'second@example.com'], $this->recipients());

        $campaign = VendorEmailCampaign::query()->sole();
        $this->assertSame(VendorEmailCampaign::STATUS_SENT, $campaign->status);
        $this->assertSame(2, $campaign->sent_count);
        $this->assertNotNull($campaign->finished_at);
        $this->assertDatabaseHas('activity_logs', ['event' => 'vendor_email_campaign.sent', 'subject_id' => $campaign->id]);
    }

    public function test_selected_merchants_only_count_those_who_can_receive_email(): void
    {
        $this->postJson('/api/v1/admin/vendor-emails', [
            'audience' => 'selected',
            'vendor_ids' => [$this->second->id, $this->inactive->id, $this->staff->id],
            'subject' => 'رسالة خاصة',
            'body' => 'نص',
        ])->assertCreated()->assertJsonPath('data.recipients_count', 1);

        $this->assertSame(['second@example.com'], $this->recipients());
    }

    public function test_refuses_an_email_with_nobody_to_receive_it(): void
    {
        $this->postJson('/api/v1/admin/vendor-emails', ['audience' => 'selected', 'vendor_ids' => [$this->inactive->id], 'subject' => 'x', 'body' => 'y'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vendor_ids');

        $this->postJson('/api/v1/admin/vendor-emails', ['audience' => 'selected', 'subject' => 'x', 'body' => 'y'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vendor_ids');

        $this->assertSame(0, VendorEmailCampaign::query()->count());
        $this->assertSame([], $this->recipients());
    }

    public function test_lists_the_history_and_searchable_recipients(): void
    {
        VendorEmailCampaign::factory()->create(['subject' => 'رسالة سابقة']);

        $this->getJson('/api/v1/admin/vendor-emails')
            ->assertOk()
            ->assertJsonPath('eligible_count', 2)
            ->assertJsonPath('data.0.subject', 'رسالة سابقة');

        $this->getJson('/api/v1/admin/vendor-emails/recipients?search=second')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.vendor_id', $this->second->id);
    }

    public function test_sending_needs_its_own_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['emails.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/vendor-emails')->assertOk();
        $this->getJson('/api/v1/admin/vendor-emails/recipients')->assertForbidden();
        $this->postJson('/api/v1/admin/vendor-emails', ['audience' => 'all', 'subject' => 'x', 'body' => 'y'])->assertForbidden();
    }
}
