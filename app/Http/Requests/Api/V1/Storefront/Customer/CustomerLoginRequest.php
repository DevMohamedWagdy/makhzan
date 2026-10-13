<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use App\Models\Customer;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerLoginRequest extends FormRequest
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
            'identifier.required' => __('forms.affiliate_identifier_required'),
            'password.required' => __('forms.password_required'),
        ];
    }

    /**
     * Finds the store's customer by phone or email and checks the password.
     *
     * @throws ValidationException
     */
    public function authenticate(): Customer
    {
        $this->ensureIsNotRateLimited();

        $identifier = trim($this->string('identifier')->toString());

        $customer = $this->route('store')->customers()
            ->where(fn ($query) => $query->where('phone', PhoneNumber::normalize($identifier))->orWhere('email', Str::lower($identifier)))
            ->first();

        // Hash::check runs on a miss too, so response time doesn't reveal unknown accounts.
        if (! Hash::check($this->string('password')->toString(), $customer?->password ?? Hash::make(Str::random())) || ! $customer) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages(['identifier' => __('auth.affiliate_invalid_credentials')]);
        }

        RateLimiter::clear($this->throttleKey());

        return $customer;
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

        throw ValidationException::withMessages([
            'identifier' => __('auth.throttle_minutes', ['minutes' => (int) ceil(RateLimiter::availableIn($this->throttleKey()) / 60)]),
        ])->status(429);
    }

    private function throttleKey(): string
    {
        return 'customer-login:'.$this->route('store')->id.'|'.Str::lower($this->string('identifier')).'|'.$this->ip();
    }
}
