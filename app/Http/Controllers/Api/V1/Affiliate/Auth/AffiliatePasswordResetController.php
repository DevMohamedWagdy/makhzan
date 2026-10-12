<?php

namespace App\Http\Controllers\Api\V1\Affiliate\Auth;

use App\Actions\Affiliates\AffiliatePasswordReset;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Affiliate\Auth\AffiliateForgotPasswordRequest;
use App\Http\Requests\Api\V1\Affiliate\Auth\AffiliateResetPasswordRequest;
use App\Models\Affiliate;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AffiliatePasswordResetController extends Controller
{
    /**
     * Emails a reset link to an active affiliate of the store with an email on file.
     * The response never reveals whether the account exists or has an email.
     */
    public function store(AffiliateForgotPasswordRequest $request, AffiliatePasswordReset $passwordReset): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());

        $affiliate = Store::query()->where('slug', $request->string('store_slug'))->firstOrFail()
            ->affiliates()
            ->where(fn ($query) => $query->where('phone', PhoneNumber::normalize($identifier))->orWhere('email', Str::lower($identifier)))
            ->first();

        if ($affiliate) {
            $passwordReset->sendLink($affiliate);
        }

        return response()->json([
            'message' => __('auth.affiliate_reset_link_sent'),
        ]);
    }

    /**
     * Sets a new password using the emailed link (store slug + affiliate id + token).
     */
    public function update(AffiliateResetPasswordRequest $request, AffiliatePasswordReset $passwordReset): JsonResponse
    {
        $affiliate = Affiliate::query()
            ->whereKey($request->integer('affiliate_id'))
            ->whereRelation('store', 'slug', $request->string('store_slug'))
            ->first();

        if (! $affiliate || ! $passwordReset->reset($affiliate, $request->string('token')->toString(), $request->validated('password'))) {
            throw ValidationException::withMessages(['token' => __('auth.reset_link_invalid')]);
        }

        return response()->json(['message' => __('auth.affiliate_password_reset')]);
    }
}
