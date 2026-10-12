<?php

namespace App\Http\Controllers\Api\V1\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Vendor\Auth\ResetPasswordRequest;
use App\Models\Vendor;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Emails a reset link to the vendor matching the email or phone. The response is
     * identical whether or not an account exists, so it can't be used to probe accounts.
     */
    public function store(ForgotPasswordRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());

        $vendor = Vendor::query()
            ->where('email', Str::lower($identifier))
            ->orWhere('phone', PhoneNumber::normalize($identifier))
            ->first();

        if ($vendor) {
            Password::broker('vendors')->sendResetLink(['email' => $vendor->email]);
        }

        return response()->json([
            'channel' => 'email',
            'message' => __('auth.vendor_reset_link_sent'),
        ]);
    }

    /**
     * Sets a new password using the emailed token and revokes every existing session.
     */
    public function update(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('vendors')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Vendor $vendor, string $password): void {
                $vendor->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $vendor->tokens()->delete();

                event(new PasswordReset($vendor));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __('auth.reset_link_invalid')]);
        }

        return response()->json(['message' => __('auth.vendor_password_reset')]);
    }
}
