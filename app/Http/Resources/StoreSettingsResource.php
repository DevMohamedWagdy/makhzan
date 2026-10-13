<?php

namespace App\Http\Resources;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Everything on the vendor's store settings page.
 *
 * @mixin Store
 */
class StoreSettingsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'store_id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'url' => $this->storefrontUrl(),
            'logo_url' => $this->logo_url,
            'description' => $this->description,
            'governorate_id' => $this->governorate_id,
            'city_id' => $this->city_id,
            'contact_phone' => $this->contact_phone,
            'whatsapp' => $this->whatsapp,
            'contact_email' => $this->contact_email,
            'address' => $this->address,
            'facebook_url' => $this->facebook_url,
            'instagram_url' => $this->instagram_url,
            'tiktok_url' => $this->tiktok_url,
            'announcement' => $this->announcement,
            'accepting_orders' => $this->accepting_orders,
            'closed_message' => $this->closed_message,
            'min_order_total' => $this->min_order_total,
            'return_policy' => $this->return_policy,
            'shipping_policy' => $this->shipping_policy,
            'privacy_policy' => $this->privacy_policy,
            'terms' => $this->terms,
        ];
    }
}
