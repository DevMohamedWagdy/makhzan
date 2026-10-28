<?php

namespace App\Http\Controllers\Api\V1\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Vendor\Auth\ResetPasswordRequest;
use App\Models\Vendor;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetController extends Controller
{
    /**
     * Emails a reset link to the vendor with this email. The response is
     * identical whether or not an account exists, so it can't be used to probe accounts.
     */
    public function store(ForgotPasswordRequest $request): JsonResponse
    {
        $vendor = Vendor::query()->where('email', Str::lower(trim($request->string('email')->toString())))->first();

        if ($vendor) {
            try {
                Password::broker('vendors')->sendResetLink(['email' => $vendor->email]);
            } catch (Throwable $exception) {
                // A mail outage shouldn't reveal whether the account exists or fail the request.
                report($exception);
            }
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
            function (Vendor $vendor, string $password) use ($request): void {
                $vendor->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $vendor->tokens()->delete();
                $vendor->notifyPasswordChanged($request);

                event(new PasswordReset($vendor));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __('auth.reset_link_invalid')]);
        }

        return response()->json(['message' => __('auth.vendor_password_reset')]);
    }
}
