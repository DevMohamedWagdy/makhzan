<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use App\Models\Vendor;
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
            'email' => ['required', 'string', 'email', 'max:255'],
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
            'email.required' => __('forms.email_required'),
            'email.email' => __('forms.email_invalid'),
            'password.required' => __('forms.password_required'),
        ];
    }

    /**
     * Resolves the vendor by email and verifies the password, rate limited per email + IP
     * so one shared network can't lock out every vendor.
     *
     * @throws ValidationException
     */
    public function authenticate(): Vendor
    {
        $this->ensureIsNotRateLimited();

        $vendor = Vendor::query()->where('email', Str::lower(trim($this->string('email')->toString())))->first();

        // Hash::check runs on a miss too, so response time doesn't reveal unknown accounts.
        $passwordMatches = Hash::check($this->string('password')->toString(), $vendor->password ?? Hash::make(Str::random()));

        if (! $vendor || ! $passwordMatches) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => __('auth.vendor_invalid_credentials'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        if ($vendor->is_active === false) {
            throw ValidationException::withMessages(['email' => __('auth.staff_inactive')]);
        }

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
            'email' => __('auth.throttle_minutes', ['minutes' => $minutes]),
        ])->status(429);
    }

    private function throttleKey(): string
    {
        return Str::transliterate(Str::lower(trim($this->string('email')->toString())).'|'.$this->ip());
    }
}
