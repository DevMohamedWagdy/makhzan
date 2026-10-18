<?php

namespace App\Http\Resources;

use App\Enums\TrackingProvider;
use App\Models\Store;
use App\Models\StoreTrackingPixel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The store's ad platform accounts for the settings page, one entry per platform (null when
 * not connected). Access tokens are never returned, only their last characters.
 *
 * @mixin Store
 */
class TrackingPixelSettingsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pixels = $this->trackingPixels->keyBy(fn (StoreTrackingPixel $pixel): string => $pixel->provider->value);

        return [
            'pixels' => collect(TrackingProvider::cases())->mapWithKeys(fn (TrackingProvider $provider): array => [
                $provider->value => ($pixel = $pixels->get($provider->value)) ? [
                    'pixel_id' => $pixel->pixel_id,
                    'is_active' => $pixel->is_active,
                    'has_access_token' => filled($pixel->access_token),
                    'access_token_hint' => filled($pixel->access_token) ? '••••'.mb_substr($pixel->access_token, -4) : null,
                    'test_event_code' => $pixel->test_event_code,
                    'last_sent_at' => $pixel->last_sent_at?->toIso8601String(),
                    'last_error' => $pixel->last_error,
                    'last_error_at' => $pixel->last_error_at?->toIso8601String(),
                ] : null,
            ]),
        ];
    }
}
