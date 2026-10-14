<?php

namespace App\Http\Requests\Api\V1\Admin;

use App\Models\Admin;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminLoginRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Verifies the admin's email and password, rate limited per email + IP.
     *
     * @throws ValidationException
     */
    public function authenticate(): Admin
    {
        if (RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            event(new Lockout($this));

            throw ValidationException::withMessages([
                'email' => __('auth.throttle_minutes', ['minutes' => (int) ceil(RateLimiter::availableIn($this->throttleKey()) / 60)]),
            ])->status(429);
        }

        $admin = Admin::query()->where('email', Str::lower(trim($this->string('email')->toString())))->first();

        // Hash::check runs on a miss too, so response time doesn't reveal unknown accounts.
        if (! Hash::check($this->string('password')->toString(), $admin->password ?? Hash::make(Str::random())) || ! $admin) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages(['email' => __('auth.vendor_invalid_credentials')]);
        }

        RateLimiter::clear($this->throttleKey());

        if ($admin->is_active === false) {
            throw ValidationException::withMessages(['email' => __('auth.staff_inactive')]);
        }

        return $admin;
    }

    private function throttleKey(): string
    {
        return 'admin-login:'.Str::lower($this->string('email')->toString()).'|'.$this->ip();
    }
}
