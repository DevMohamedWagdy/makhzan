<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AffiliateImpersonationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_issues_a_30_minute_affiliate_token_and_logs_the_impersonation(): void
    {
        $this->freezeSecond();
        Log::spy();
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $response = $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/impersonate")
            ->assertOk()
            ->assertJsonPath('affiliate.affiliate_id', $affiliate->id)
            ->assertJsonPath('expires_at', now()->addMinutes(30)->toIso8601String());

        $token = PersonalAccessToken::findToken($response->json('token'));
        $this->assertTrue($token->tokenable->is($affiliate));
        $this->assertSame([Affiliate::IMPERSONATION_ABILITY], $token->abilities);
        Log::shouldHaveReceived('info')->withArgs(fn (string $message, array $context): bool => $context['vendor_id'] === $vendor->id && $context['affiliate_id'] === $affiliate->id);
    }

    public function test_impersonation_token_cannot_call_vendor_endpoints(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();
        $token = $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/impersonate")->json('token');

        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/v1/vendor/affiliates')->assertForbidden();
    }

    public function test_returns_422_for_a_pending_applicant(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create();

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/impersonate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('affiliate');
        $this->assertSame(0, $affiliate->tokens()->count());
    }

    public function test_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->postJson("/api/v1/vendor/affiliates/{$foreign->id}/impersonate")->assertNotFound();
        $this->assertSame(0, $foreign->tokens()->count());
    }
}
