<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateStoreSettingsRequest;
use App\Http\Requests\Api\V1\Vendor\UploadStoreLogoRequest;
use App\Http\Resources\StoreSettingsResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreSettingsController extends Controller
{
    public function show(Request $request): StoreSettingsResource
    {
        return new StoreSettingsResource($request->user()->store);
    }

    /**
     * Save one settings tab: only the fields sent are changed. The store's address (slug)
     * isn't editable, since shared referral and coupon links depend on it.
     */
    public function update(UpdateStoreSettingsRequest $request): StoreSettingsResource
    {
        $store = $request->user()->store;
        $store->update($request->validated());

        return new StoreSettingsResource($store);
    }

    /**
     * Replace the logo; the previous file is deleted.
     */
    public function uploadLogo(UploadStoreLogoRequest $request): StoreSettingsResource
    {
        $store = $request->user()->store;
        $previous = $store->logo_path;

        $store->update(['logo_path' => $request->file('logo')->store('stores/logos', 'public')]);

        if ($previous) {
            Storage::disk('public')->delete($previous);
        }

        return new StoreSettingsResource($store);
    }

    public function removeLogo(Request $request): StoreSettingsResource
    {
        $store = $request->user()->store;

        if ($store->logo_path) {
            Storage::disk('public')->delete($store->logo_path);
            $store->update(['logo_path' => null]);
        }

        return new StoreSettingsResource($store);
    }
}
