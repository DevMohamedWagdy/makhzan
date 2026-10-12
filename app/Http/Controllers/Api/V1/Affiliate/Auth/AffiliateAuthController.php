<?php

namespace App\Http\Controllers\Api\V1\Affiliate\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Affiliate\Auth\AffiliateLoginRequest;
use App\Http\Resources\AffiliateSelfResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AffiliateAuthController extends Controller
{
    /**
     * Log in to a store's affiliate portal with phone or email.
     */
    public function login(AffiliateLoginRequest $request): JsonResponse
    {
        $affiliate = $request->authenticate();
        $affiliate->forceFill(['last_active_at' => now()])->save();
        $affiliate->rememberLocale();

        return response()->json([
            'token' => $affiliate->issueToken($request->boolean('remember')),
            'affiliate' => new AffiliateSelfResource($affiliate->load(['store', 'referralCodes.store'])),
        ]);
    }

    /**
     * Everything the affiliate dashboard shows. Also serves vendor impersonation sessions.
     */
    public function me(Request $request): AffiliateSelfResource
    {
        return new AffiliateSelfResource($request->user()->load(['store', 'referralCodes.store']));
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
