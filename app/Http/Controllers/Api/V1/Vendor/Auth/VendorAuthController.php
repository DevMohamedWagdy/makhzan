<?php

namespace App\Http\Controllers\Api\V1\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Vendor\Auth\RegisterVendorRequest;
use App\Http\Resources\VendorResource;
use App\Models\Admin;
use App\Models\Vendor;
use App\Notifications\AdminAlertNotification;
use App\Support\ActivityLogger;
use App\Support\VendorEmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VendorAuthController extends Controller
{
    /**
     * Log in with email or phone and receive a bearer token. An account whose email isn't
     * confirmed yet gets a verification code instead, and the token once it's entered.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $vendor = $request->authenticate();

        if (! $vendor->hasVerifiedEmail()) {
            return response()->json(VendorEmailVerification::start($vendor, $request->boolean('remember')));
        }

        return $this->signIn($request, $vendor, $request->boolean('remember'));
    }

    /**
     * Two-step sign-up: creates the vendor and their store together, then emails the code
     * that confirms their address (verifyEmail signs them in).
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

        $vendor->rememberLocale();
        $store = $vendor->store()->first();
        Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::STORE_REGISTERED, ['store_id' => $store->id, 'store_name' => $store->name, 'owner_name' => $vendor->full_name]));

        return response()->json(VendorEmailVerification::start($vendor, remember: true), Response::HTTP_CREATED);
    }

    /**
     * Confirms the emailed code and signs the vendor in.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge' => ['required', 'string', 'max:64'],
            'code' => ['required', 'digits:6'],
        ], ['code.required' => __('auth.verification_code_invalid'), 'code.digits' => __('auth.verification_code_invalid')]);

        ['vendor' => $vendor, 'remember' => $remember] = VendorEmailVerification::verify($validated['challenge'], $validated['code']);

        if ($vendor->is_active === false) {
            throw ValidationException::withMessages(['code' => __('auth.staff_inactive')]);
        }

        return $this->signIn($request, $vendor, $remember);
    }

    /**
     * Emails a new code for the same sign-up or sign-in.
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate(['challenge' => ['required', 'string', 'max:64']]);

        return response()->json(VendorEmailVerification::resend($validated['challenge']));
    }

    /**
     * The authenticated vendor and their store.
     */
    public function me(Request $request): VendorResource
    {
        return new VendorResource($request->user()->withStore());
    }

    /**
     * Revokes the token used for this request.
     */
    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    private function signIn(Request $request, Vendor $vendor, bool $remember): JsonResponse
    {
        $vendor->rememberLocale();
        $vendor->forceFill(['last_login_at' => now()])->saveQuietly();
        $vendor->notifyIfNewDevice($request);
        ActivityLogger::log('vendor.login', $vendor, actor: $vendor);

        return $this->tokenResponse($vendor, $vendor->issueToken($remember));
    }

    private function tokenResponse(Vendor $vendor, string $token, int $status = Response::HTTP_OK): JsonResponse
    {
        return response()->json([
            'token' => $token,
            'vendor' => new VendorResource($vendor->withStore()),
        ], $status);
    }
}
