<?php

namespace App\Support;

use App\Models\Affiliate;
use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Emailed 6-digit codes that confirm an account's email (vendors and affiliates) before it gets
 * a token. Sign-up and sign-in open a "challenge" (an opaque id the browser holds); the code is
 * checked against it, with a few attempts per code and a cooldown between resends. The latest
 * code is also kept (encrypted, for as long as it's valid) per account, so the platform team can
 * read it to a merchant when email delivery fails.
 */
class EmailVerification
{
    public const CODE_MINUTES = 10;

    public const RESEND_SECONDS = 60;

    private const MAX_ATTEMPTS = 5;

    /** How long a challenge can be resent before the account has to sign in again. */
    private const CHALLENGE_MINUTES = 60;

    /** @var array<string, class-string<Vendor|Affiliate>> */
    private const ACCOUNTS = ['vendor' => Vendor::class, 'affiliate' => Affiliate::class];

    /**
     * Opens a challenge and emails the first code.
     *
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     */
    public static function start(Vendor|Affiliate $account, bool $remember): array
    {
        $challenge = Str::random(48);
        $type = array_search($account::class, self::ACCOUNTS, true);

        self::sendCode($type, $challenge, ['account_id' => $account->getKey(), 'remember' => $remember], $account);

        return self::response($challenge, $account);
    }

    /**
     * Emails a fresh code for an open challenge.
     *
     * @param  'vendor'|'affiliate'  $type
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     *
     * @throws ValidationException
     */
    public static function resend(string $type, string $challenge): array
    {
        $state = self::state($type, $challenge);
        $wait = self::RESEND_SECONDS - (now()->getTimestamp() - $state['sent_at']);

        if ($wait > 0) {
            throw ValidationException::withMessages(['code' => __('auth.verification_resend_wait', ['seconds' => $wait])])->status(429);
        }

        $account = self::ACCOUNTS[$type]::query()->findOrFail($state['account_id']);
        self::sendCode($type, $challenge, $state, $account);

        return self::response($challenge, $account);
    }

    /**
     * Checks the code and marks the email verified.
     *
     * @param  'vendor'|'affiliate'  $type
     * @return array{account: Vendor|Affiliate, remember: bool}
     *
     * @throws ValidationException
     */
    public static function verify(string $type, string $challenge, string $code): array
    {
        $state = self::state($type, $challenge);

        if (now()->getTimestamp() > $state['code_expires_at'] || $state['attempts'] >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => __('auth.verification_code_expired')]);
        }

        if (! hash_equals($state['code_hash'], self::hash($code))) {
            $state['attempts']++;
            Cache::put(self::cacheKey($type, $challenge), $state, now()->addMinutes(self::CHALLENGE_MINUTES));

            throw ValidationException::withMessages(['code' => __('auth.verification_code_invalid')]);
        }

        Cache::forget(self::cacheKey($type, $challenge));
        Cache::forget(self::pendingKey($type, $state['account_id']));

        $account = self::ACCOUNTS[$type]::query()->findOrFail($state['account_id']);
        $account->forceFill(['email_verified_at' => now()])->save();

        return ['account' => $account, 'remember' => (bool) $state['remember']];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private static function sendCode(string $type, string $challenge, array $state, Vendor|Affiliate $account): void
    {
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        Cache::put(self::cacheKey($type, $challenge), [
            ...$state,
            'code_hash' => self::hash($code),
            // Unix timestamps, not Carbon: the cache refuses to unserialize objects (serializable_classes).
            'code_expires_at' => now()->addMinutes(self::CODE_MINUTES)->getTimestamp(),
            'sent_at' => now()->getTimestamp(),
            'attempts' => 0,
        ], now()->addMinutes(self::CHALLENGE_MINUTES));

        Cache::put(self::pendingKey($type, $account->getKey()), [
            'code' => Crypt::encryptString($code),
            'expires_at' => now()->addMinutes(self::CODE_MINUTES)->getTimestamp(),
        ], now()->addMinutes(self::CODE_MINUTES));

        try {
            $account->notify(new EmailVerificationCodeNotification($code, self::CODE_MINUTES));
        } catch (Throwable $exception) {
            // The account can ask for another code; a mail outage shouldn't fail sign-up.
            report($exception);
        }
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    private static function state(string $type, string $challenge): array
    {
        $state = Cache::get(self::cacheKey($type, $challenge));

        if (! is_array($state) || ! isset($state['account_id'])) {
            throw ValidationException::withMessages(['code' => __('auth.verification_code_expired')]);
        }

        // Challenges cached before the times became timestamps hold unreadable objects: treat the
        // code as expired but let a new one be sent right away.
        if (! is_int($state['sent_at'] ?? null) || ! is_int($state['code_expires_at'] ?? null)) {
            $state = [...$state, 'sent_at' => 0, 'code_expires_at' => 0];
        }

        return $state;
    }

    /**
     * @return array{verification_required: true, challenge: string, email: string, resend_in: int, message: string}
     */
    private static function response(string $challenge, Vendor|Affiliate $account): array
    {
        $email = self::maskEmail($account->email);

        return [
            'verification_required' => true,
            'challenge' => $challenge,
            'email' => $email,
            'resend_in' => self::RESEND_SECONDS,
            'message' => __('auth.verification_code_sent', ['email' => $email]),
        ];
    }

    /**
     * The account's latest unexpired code, for the platform team to pass on when the email didn't
     * arrive; null once the email is verified or the code has expired.
     *
     * @return array{code: string, expires_at: string}|null
     */
    public static function pendingCode(Vendor|Affiliate $account): ?array
    {
        if ($account->email_verified_at !== null) {
            return null;
        }

        $pending = Cache::get(self::pendingKey(array_search($account::class, self::ACCOUNTS, true), $account->getKey()));

        if (! is_array($pending) || ($pending['expires_at'] ?? 0) < now()->getTimestamp()) {
            return null;
        }

        return [
            'code' => Crypt::decryptString($pending['code']),
            'expires_at' => now()->setTimestamp($pending['expires_at'])->toIso8601String(),
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

    private static function pendingKey(string $type, int|string $accountId): string
    {
        return "email-verification:pending:{$type}:{$accountId}";
    }

    /**
     * Keyed by account type too, so a vendor challenge can't be used on the affiliate endpoint.
     */
    private static function cacheKey(string $type, string $challenge): string
    {
        return "email-verification:{$type}:".hash('sha256', $challenge);
    }
}
