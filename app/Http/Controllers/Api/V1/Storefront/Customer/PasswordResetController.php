<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Actions\Customers\CustomerPasswordReset;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\CustomerForgotPasswordRequest;
use App\Http\Requests\Api\V1\Storefront\Customer\CustomerResetPasswordRequest;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Emails a reset link to the store's customer with that phone or email.
     * The response never reveals whether the account exists or has an email.
     */
    public function store(CustomerForgotPasswordRequest $request, Store $store, CustomerPasswordReset $passwordReset): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());

        $customer = $store->customers()
            ->where(fn ($query) => $query->where('phone', PhoneNumber::normalize($identifier))->orWhere('email', Str::lower($identifier)))
            ->first();

        if ($customer) {
            $passwordReset->sendLink($customer);
        }

        return response()->json(['message' => __('auth.customer_reset_link_sent')]);
    }

    /**
     * Sets a new password using the emailed link (customer id + token).
     */
    public function update(CustomerResetPasswordRequest $request, Store $store, CustomerPasswordReset $passwordReset): JsonResponse
    {
        $customer = $store->customers()->whereKey($request->integer('customer_id'))->first();

        if (! $customer || ! $passwordReset->reset($customer, $request->string('token')->toString(), $request->validated('password'))) {
            throw ValidationException::withMessages(['token' => __('auth.reset_link_invalid')]);
        }

        return response()->json(['message' => __('auth.customer_password_reset')]);
    }
}
