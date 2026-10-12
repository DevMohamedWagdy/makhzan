<?php

namespace Tests\Feature\Api\V1\Affiliate\Auth;

use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AffiliatePasswordControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/affiliate/auth/password';

    public function test_changes_password_and_revokes_other_sessions_but_keeps_the_current_one(): void
    {
        $affiliate = Affiliate::factory()->create();
        $current = $affiliate->issueToken(remember: false);
        $other = $affiliate->issueToken(remember: true);

        $this->withToken($current)->putJson(self::URL, [
            'current_password' => 'password1',
            'password' => 'NewPass2026',
            'password_confirmation' => 'NewPass2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPass2026', $affiliate->fresh()->password));
        $this->assertNotNull(PersonalAccessToken::findToken($current));
        $this->assertNull(PersonalAccessToken::findToken($other));
    }

    public function test_rejects_wrong_current_password(): void
    {
        $affiliate = Affiliate::factory()->create();

        $this->withToken($affiliate->issueToken(remember: false))->putJson(self::URL, [
            'current_password' => 'wrong-pass1',
            'password' => 'NewPass2026',
            'password_confirmation' => 'NewPass2026',
        ])->assertUnprocessable()->assertJsonValidationErrors(['current_password' => 'كلمة المرور الحالية غير صحيحة']);
    }

    public function test_rejects_reusing_the_current_password(): void
    {
        $affiliate = Affiliate::factory()->create(['password' => 'SamePass2026']);

        $this->withToken($affiliate->issueToken(remember: false))->putJson(self::URL, [
            'current_password' => 'SamePass2026',
            'password' => 'SamePass2026',
            'password_confirmation' => 'SamePass2026',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password' => 'اختر كلمة مرور مختلفة عن الحالية']);
    }

    public function test_vendor_impersonation_token_cannot_change_the_password(): void
    {
        $affiliate = Affiliate::factory()->create();
        $token = $affiliate->createToken('impersonation', [Affiliate::IMPERSONATION_ABILITY])->plainTextToken;

        $this->withToken($token)->putJson(self::URL, [
            'current_password' => 'password1',
            'password' => 'NewPass2026',
            'password_confirmation' => 'NewPass2026',
        ])->assertForbidden()->assertJsonPath('message', 'هذا الإجراء غير متاح أثناء الدخول بصفة المسوق.');

        $this->assertTrue(Hash::check('password1', $affiliate->fresh()->password));
    }
}
