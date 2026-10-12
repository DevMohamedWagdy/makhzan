<?php

namespace App\Http\Controllers\Api\V1\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Vendor\Auth\RegisterVendorRequest;
use App\Http\Resources\VendorResource;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class VendorAuthController extends Controller
{
    /**
     * Log in with email or phone and receive a bearer token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $vendor = $request->authenticate();

        return $this->tokenResponse($vendor, $vendor->issueToken($request->boolean('remember')));
    }

    /**
     * Two-step sign-up: creates the vendor and their store together, then logs them in.
     */
    public function register(RegisterVendorRequest $request): JsonResponse
    {
        $logoPath = $request->file('store.logo')?->store('stores/logos', 'public');

        $vendor = DB::transaction(function () use ($request, $logoPath): Vendor {
            $vendor = Vendor::create($request->safe()->collect('vendor')->only(['full_name', 'phone', 'email', 'password'])->all());

            $vendor->store()->create([
                ...$request->safe()->collect('store')->only(['name', 'slug', 'governorate_id', 'city_id'])->all(),
                'logo_path' => $logoPath,
            ]);

            return $vendor;
        });

        return $this->tokenResponse($vendor, $vendor->issueToken(remember: true), Response::HTTP_CREATED);
    }

    /**
     * The authenticated vendor and their store.
     */
    public function me(Request $request): VendorResource
    {
        return new VendorResource($request->user()->load('store'));
    }

    /**
     * Revokes the token used for this request.
     */
    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    private function tokenResponse(Vendor $vendor, string $token, int $status = Response::HTTP_OK): JsonResponse
    {
        return response()->json([
            'token' => $token,
            'vendor' => new VendorResource($vendor->load('store')),
        ], $status);
    }
}
