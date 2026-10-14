<?php

namespace App\Http\Controllers\Api\V1\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\Auth\UpdateVendorPasswordRequest;
use App\Http\Requests\Api\V1\Vendor\Auth\UpdateVendorProfileRequest;
use App\Http\Resources\VendorResource;
use Illuminate\Http\JsonResponse;

class VendorAccountController extends Controller
{
    /**
     * The vendor's name, phone and email (phone and email are also how they sign in).
     */
    public function updateProfile(UpdateVendorProfileRequest $request): VendorResource
    {
        $vendor = $request->user();
        $vendor->update($request->validated());

        return new VendorResource($vendor->withStore());
    }

    /**
     * Change the password; every other session (other devices) is signed out.
     */
    public function updatePassword(UpdateVendorPasswordRequest $request): JsonResponse
    {
        $vendor = $request->user();
        $vendor->forceFill(['password' => $request->validated('password')])->save();

        $vendor->tokens()->whereKeyNot($vendor->currentAccessToken()->getKey())->delete();

        return response()->json(['message' => __('auth.password_changed')]);
    }
}
