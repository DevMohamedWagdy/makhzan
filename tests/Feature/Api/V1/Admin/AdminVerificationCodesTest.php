<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * When the verification email doesn't arrive, the platform team can read the merchant's waiting code
 * from the stores list and pass it on.
 */
class AdminVerificationCodesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        // Serialize like the real cache stores, which refuse to unserialize objects (cache.serializable_classes).
        config(['cache.stores.array.serialize' => true]);
        Cache::forgetDriver('array');
    }

    private function startVerification(Vendor $vendor): string
    {
        $challenge = $this->postJson('/api/v1/vendor/auth/login', ['email' => $vendor->email, 'password' => 'password1'])->json('challenge');

        $this->assertNotNull($challenge);

        return $challenge;
    }

    private function lastCode(Vendor $vendor): string
    {
        return Notification::sent($vendor, EmailVerificationCodeNotification::class)->last()->code;
    }

    public function test_admins_see_the_owners_waiting_code_until_it_is_used(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $challenge = $this->startVerification($vendor);

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/stores')
            ->assertOk()
            ->assertJsonPath('data.0.owner.email_verified', false)
            ->assertJsonPath('data.0.owner.pending_verification.code', $this->lastCode($vendor));

        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($vendor)])->assertOk();

        $this->getJson('/api/v1/admin/stores')
            ->assertJsonPath('data.0.owner.email_verified', true)
            ->assertJsonPath('data.0.owner.pending_verification', null);
    }

    public function test_a_resent_code_replaces_the_one_admins_see_and_expired_codes_disappear(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $challenge = $this->startVerification($vendor);

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/vendor/auth/verify-email/resend', ['challenge' => $challenge])->assertOk();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
        $this->getJson("/api/v1/admin/stores/{$vendor->store->id}")->assertJsonPath('data.owner.pending_verification.code', $this->lastCode($vendor));
        $this->assertCount(2, Notification::sent($vendor, EmailVerificationCodeNotification::class));

        $this->travel(11)->minutes();
        $this->getJson("/api/v1/admin/stores/{$vendor->store->id}")->assertJsonPath('data.owner.pending_verification', null);
    }

    public function test_only_admins_who_can_update_merchant_accounts_see_codes(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $this->startVerification($vendor);

        Sanctum::actingAs(Admin::factory()->withPermissions(['stores.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/stores')
            ->assertOk()
            ->assertJsonPath('data.0.owner.email_verified', false)
            ->assertJsonMissingPath('data.0.owner.pending_verification');
    }
}
