<?php

namespace App\Http\Controllers\Api\V1\Affiliate\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Affiliate\Auth\UpdateAffiliatePasswordRequest;
use Illuminate\Http\JsonResponse;

class AffiliatePasswordController extends Controller
{
    /**
     * Changes the password and signs out every other device.
     */
    public function update(UpdateAffiliatePasswordRequest $request): JsonResponse
    {
        $affiliate = $request->user();
        $affiliate->forceFill(['password' => $request->validated('password')])->save();

        $affiliate->tokens()->whereKeyNot($affiliate->currentAccessToken()->getKey())->delete();

        return response()->json(['message' => 'تم تغيير كلمة المرور، وتم تسجيل الخروج من الأجهزة الأخرى.']);
    }
}
