<?php

namespace App\Http\Requests\Api\V1\Affiliate\Auth;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AffiliateLoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Affiliates belong to one store; the same phone may exist in several stores.
            'store_slug' => ['required', 'string', Rule::exists('stores', 'slug')],
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'store_slug.required' => __('forms.store_missing'),
            'store_slug.exists' => __('forms.store_not_found'),
            'identifier.required' => __('forms.affiliate_identifier_required'),
            'password.required' => __('forms.password_required'),
        ];
    }

    /**
     * Verifies credentials within the store. The account status is only revealed after the
     * password matches, so a pending or frozen account can't be probed by phone number.
     * Imported affiliates without a password get the generic failure until the vendor sets one.
     *
     * @throws ValidationException
     */
    public function authenticate(): Affiliate
    {
        $this->ensureIsNotRateLimited();

        $store = Store::query()->where('slug', $this->string('store_slug'))->firstOrFail();
        $identifier = trim($this->string('identifier')->toString());

        $affiliate = $store->affiliates()
            ->where(fn ($query) => $query->where('phone', PhoneNumber::normalize($identifier))->orWhere('email', Str::lower($identifier)))
            ->first();

        // Hash::check runs on a miss too, so response time doesn't reveal unknown accounts.
        $passwordMatches = Hash::check($this->string('password')->toString(), $affiliate?->password ?? Hash::make(Str::random()));

        if (! $affiliate || ! $affiliate->password || ! $passwordMatches) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages(['identifier' => __('auth.affiliate_invalid_credentials')]);
        }

        RateLimiter::clear($this->throttleKey());

        $statusMessage = match ($affiliate->status) {
            AffiliateStatus::Pending => __('auth.affiliate_pending'),
            AffiliateStatus::Frozen => __('auth.affiliate_frozen'),
            AffiliateStatus::Active => null,
        };

        if ($statusMessage) {
            throw ValidationException::withMessages(['identifier' => $statusMessage]);
        }

        return $affiliate;
    }

    /**
     * @throws ValidationException
     */
    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $minutes = (int) ceil(RateLimiter::availableIn($this->throttleKey()) / 60);

        throw ValidationException::withMessages([
            'identifier' => __('auth.throttle_minutes', ['minutes' => $minutes]),
        ])->status(429);
    }

    private function throttleKey(): string
    {
        return 'affiliate|'.Str::transliterate(Str::lower($this->string('store_slug').'|'.$this->string('identifier')).'|'.$this->ip());
    }
}
