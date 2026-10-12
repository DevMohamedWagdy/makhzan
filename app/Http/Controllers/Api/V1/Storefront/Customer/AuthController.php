<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\CustomerLoginRequest;
use App\Http\Requests\Api\V1\Storefront\Customer\RegisterCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    /**
     * Create a shopper account in this store and sign in.
     */
    public function register(RegisterCustomerRequest $request, Store $store): JsonResponse
    {
        $customer = $store->customers()->create($request->safe()->only(['full_name', 'phone', 'email', 'password']));
        $customer->rememberLocale();

        return $this->tokenResponse($customer, $customer->issueToken(remember: true), Response::HTTP_CREATED);
    }

    /**
     * Sign in with phone or email.
     */
    public function login(CustomerLoginRequest $request, Store $store): JsonResponse
    {
        $customer = $request->authenticate();
        $customer->rememberLocale();

        return $this->tokenResponse($customer, $customer->issueToken($request->boolean('remember')));
    }

    public function me(Request $request): CustomerResource
    {
        return new CustomerResource($request->user());
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    private function tokenResponse(Customer $customer, string $token, int $status = Response::HTTP_OK): JsonResponse
    {
        return response()->json(['token' => $token, 'customer' => new CustomerResource($customer)], $status);
    }
}
