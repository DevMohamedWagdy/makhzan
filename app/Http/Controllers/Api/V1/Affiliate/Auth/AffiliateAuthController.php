<?php

namespace App\Http\Controllers\Api\V1\Affiliate\Auth;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Affiliate\Auth\AffiliateLoginRequest;
use App\Http\Resources\AffiliateSelfResource;
use App\Models\Affiliate;
use App\Support\EmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class AffiliateAuthController extends Controller
{
    /**
     * Log in to a store's affiliate portal with email. An affiliate whose email isn't confirmed
     * yet gets a verification code instead, and the token once it's entered.
     */
    public function login(AffiliateLoginRequest $request): JsonResponse
    {
        $affiliate = $request->authenticate();

        if (! $affiliate->hasVerifiedEmail()) {
            return response()->json(EmailVerification::start($affiliate, $request->boolean('remember')));
        }

        return $this->signIn($affiliate, $request->boolean('remember'));
    }

    /**
     * Confirms the emailed code and signs the affiliate in.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge' => ['required', 'string', 'max:64'],
            'code' => ['required', 'digits:6'],
        ], ['code.required' => __('auth.verification_code_invalid'), 'code.digits' => __('auth.verification_code_invalid')]);

        ['account' => $affiliate, 'remember' => $remember] = EmailVerification::verify('affiliate', $validated['challenge'], $validated['code']);

        // The store may have frozen the account between sign-in and the code.
        if ($affiliate->status !== AffiliateStatus::Active) {
            throw ValidationException::withMessages(['code' => __('auth.affiliate_inactive')]);
        }

        return $this->signIn($affiliate, $remember);
    }

    /**
     * Emails a new code for the same sign-in.
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate(['challenge' => ['required', 'string', 'max:64']]);

        return response()->json(EmailVerification::resend('affiliate', $validated['challenge']));
    }

    /**
     * Everything the affiliate dashboard shows. Also serves vendor impersonation sessions.
     */
    public function me(Request $request): AffiliateSelfResource
    {
        return new AffiliateSelfResource($request->user()->load(['store', 'referralCodes.store', 'coupons' => fn ($query) => $query->inState('active')]));
    }

    private function signIn(Affiliate $affiliate, bool $remember): JsonResponse
    {
        $affiliate->forceFill(['last_active_at' => now()])->save();
        $affiliate->rememberLocale();

        return response()->json([
            'token' => $affiliate->issueToken($remember),
            'affiliate' => new AffiliateSelfResource($affiliate->load(['store', 'referralCodes.store', 'coupons' => fn ($query) => $query->inState('active')])),
        ]);
    }

    /**
     * Revokes the token used for this request (including an impersonation token).
     */
    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
