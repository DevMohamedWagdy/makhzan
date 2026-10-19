<?php

namespace App\Support;

use App\Models\Vendor;
use App\Notifications\VendorVerificationCodeNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Emailed 6-digit codes that confirm a vendor's email before they get a dashboard token.
 * Sign-up and sign-in open a "challenge" (an opaque id the browser holds); the code is checked
 * against it, with a few attempts per code and a cooldown between resends.
 */
class VendorEmailVerification
{
    public const CODE_MINUTES = 10;

    public const RESEND_SECONDS = 60;

    private const MAX_ATTEMPTS = 5;

    /** How long a challenge can be resent before the vendor has to sign in again. */
    private const CHALLENGE_MINUTES = 60;

    /**
     * Opens a challenge and emails the first code.
     *
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     */
    public static function start(Vendor $vendor, bool $remember): array
    {
        $challenge = Str::random(48);
        self::sendCode($challenge, ['vendor_id' => $vendor->id, 'remember' => $remember], $vendor);

        return self::response($challenge, $vendor);
    }

    /**
     * Emails a fresh code for an open challenge.
     *
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     *
     * @throws ValidationException
     */
    public static function resend(string $challenge): array
    {
        $state = self::state($challenge);
        $wait = self::RESEND_SECONDS - (int) now()->diffInSeconds($state['sent_at'], true);

        if ($wait > 0) {
            throw ValidationException::withMessages(['code' => __('auth.verification_resend_wait', ['seconds' => $wait])])->status(429);
        }

        $vendor = Vendor::query()->findOrFail($state['vendor_id']);
        self::sendCode($challenge, $state, $vendor);

        return self::response($challenge, $vendor);
    }

    /**
     * Checks the code and marks the email verified.
     *
     * @return array{vendor: Vendor, remember: bool}
     *
     * @throws ValidationException
     */
    public static function verify(string $challenge, string $code): array
    {
        $state = self::state($challenge);

        if (now()->greaterThan($state['code_expires_at']) || $state['attempts'] >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => __('auth.verification_code_expired')]);
        }

        if (! hash_equals($state['code_hash'], self::hash($code))) {
            $state['attempts']++;
            Cache::put(self::cacheKey($challenge), $state, now()->addMinutes(self::CHALLENGE_MINUTES));

            throw ValidationException::withMessages(['code' => __('auth.verification_code_invalid')]);
        }

        Cache::forget(self::cacheKey($challenge));

        $vendor = Vendor::query()->findOrFail($state['vendor_id']);
        $vendor->forceFill(['email_verified_at' => now()])->save();

        return ['vendor' => $vendor, 'remember' => (bool) $state['remember']];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private static function sendCode(string $challenge, array $state, Vendor $vendor): void
    {
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        Cache::put(self::cacheKey($challenge), [
            ...$state,
            'code_hash' => self::hash($code),
            'code_expires_at' => now()->addMinutes(self::CODE_MINUTES),
            'sent_at' => now(),
            'attempts' => 0,
        ], now()->addMinutes(self::CHALLENGE_MINUTES));

        try {
            $vendor->notify(new VendorVerificationCodeNotification($code, self::CODE_MINUTES));
        } catch (Throwable $exception) {
            // The vendor can ask for another code; a mail outage shouldn't fail sign-up.
            report($exception);
        }
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    private static function state(string $challenge): array
    {
        return Cache::get(self::cacheKey($challenge)) ?? throw ValidationException::withMessages(['code' => __('auth.verification_code_expired')]);
    }

    /**
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     */
    private static function response(string $challenge, Vendor $vendor): array
    {
        $email = self::maskEmail($vendor->email);

        return [
            'verification_required' => true,
            'challenge' => $challenge,
            'email' => $email,
            'resend_in' => self::RESEND_SECONDS,
            'message' => __('auth.verification_code_sent', ['email' => $email]),
        ];
    }

    /**
     * "mohamed@gmail.com" becomes "mo*****@gmail.com".
     */
    public static function maskEmail(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = min(2, max(1, mb_strlen($name) - 1));

        return mb_substr($name, 0, $visible).str_repeat('*', max(1, mb_strlen($name) - $visible)).'@'.$domain;
    }

    private static function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }

    private static function cacheKey(string $challenge): string
    {
        return 'vendor-email-verification:'.hash('sha256', $challenge);
    }
}
