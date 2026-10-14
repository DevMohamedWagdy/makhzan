<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateTrackingPixelsRequest;
use App\Http\Resources\TrackingPixelSettingsResource;
use Illuminate\Http\Request;

class TrackingPixelController extends Controller
{
    public function show(Request $request): TrackingPixelSettingsResource
    {
        return new TrackingPixelSettingsResource($request->user()->store->load('trackingPixels'));
    }

    /**
     * Connects, updates or (with an empty pixel ID) disconnects each platform sent. Changing a
     * pixel clears its last delivery result, which belonged to the old setup.
     */
    public function update(UpdateTrackingPixelsRequest $request): TrackingPixelSettingsResource
    {
        $store = $request->user()->store;

        foreach ($request->validated('pixels') as $provider => $input) {
            $pixel = $store->trackingPixels()->firstOrNew(['provider' => $provider]);

            if (blank($input['pixel_id'] ?? null)) {
                $pixel->exists && $pixel->delete();

                continue;
            }

            $pixel->fill([
                'pixel_id' => $input['pixel_id'],
                'test_event_code' => $input['test_event_code'] ?? null,
                'is_active' => $input['is_active'] ?? true,
                'access_token' => filled($input['access_token'] ?? null) ? trim($input['access_token']) : $pixel->access_token,
            ]);

            if ($pixel->isDirty(['pixel_id', 'access_token'])) {
                $pixel->forceFill(['last_sent_at' => null, 'last_error' => null, 'last_error_at' => null]);
            }

            $pixel->save();
        }

        return new TrackingPixelSettingsResource($store->load('trackingPixels'));
    }
}
