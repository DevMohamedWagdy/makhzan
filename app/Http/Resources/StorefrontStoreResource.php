<?php

namespace App\Http\Resources;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The store as shoppers see it: identity, contact, social links, announcement, whether it's
 * taking orders, and which policy pages exist (their text loads on its own page).
 *
 * @mixin Store
 */
class StorefrontStoreResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...(new PublicStoreResource($this->resource))->toArray($request),
            'description' => $this->description,
            'contact' => [
                'phone' => $this->contact_phone,
                'whatsapp' => $this->whatsapp,
                'email' => $this->contact_email,
                'address' => $this->address,
            ],
            'social' => array_filter([
                'facebook' => $this->facebook_url,
                'instagram' => $this->instagram_url,
                'tiktok' => $this->tiktok_url,
            ]),
            'announcement' => $this->announcement,
            'accepting_orders' => $this->accepting_orders,
            'closed_message' => $this->accepting_orders ? null : ($this->closed_message ?: __('settings.store_closed')),
            'min_order_total' => $this->min_order_total,
            'policies' => collect(Store::POLICIES)
                ->filter(fn (string $column): bool => filled($this->{$column}))
                ->keys()
                ->map(fn (string $key): array => ['key' => $key, 'title' => __("settings.policies.{$key}")])
                ->values(),
        ];
    }
}
