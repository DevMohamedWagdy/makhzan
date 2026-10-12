<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use App\Models\Vendor;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
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
            'identifier.required' => __('forms.identifier_required'),
            'password.required' => __('forms.password_required'),
        ];
    }

    /**
     * Resolves the vendor by email or phone and verifies the password, rate limited
     * per identifier + IP so one shared network can't lock out every vendor.
     *
     * @throws ValidationException
     */
    public function authenticate(): Vendor
    {
        $this->ensureIsNotRateLimited();

        $identifier = trim($this->string('identifier')->toString());
        $vendor = Vendor::query()
            ->where('email', Str::lower($identifier))
            ->orWhere('phone', PhoneNumber::normalize($identifier))
            ->first();

        // Hash::check runs on a miss too, so response time doesn't reveal unknown accounts.
        $passwordMatches = Hash::check($this->string('password')->toString(), $vendor->password ?? Hash::make(Str::random()));

        if (! $vendor || ! $passwordMatches) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'identifier' => __('auth.vendor_invalid_credentials'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        return $vendor;
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
        return Str::transliterate(Str::lower($this->string('identifier')->toString()).'|'.$this->ip());
    }
}
