<?php

namespace App\Http\Resources;

use App\Models\Admin;
use App\Models\Store;
use App\Support\EmailVerification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * A store as the platform team sees it: owner, suspension and activity.
 *
 * @mixin Store
 */
class AdminStoreResource extends JsonResource
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
            'governorate_id' => $this->governorate_id,
            'owner' => $this->whenLoaded('vendor', fn (): array => [
                'vendor_id' => $this->vendor->id,
                'full_name' => $this->vendor->full_name,
                'phone' => $this->vendor->phone,
                'email' => $this->vendor->email,
                'email_verified' => $this->vendor->email_verified_at !== null,
                // The code waiting in the owner's inbox, for admins who help merchants with their accounts.
                'pending_verification' => $this->when(
                    $request->user() instanceof Admin && $request->user()->hasPermission('vendors.update'),
                    fn (): ?array => EmailVerification::pendingCode($this->vendor),
                ),
            ]),
            'suspended_at' => $this->suspended_at?->toIso8601String(),
            'suspension_reason' => $this->suspension_reason,
            'accepting_orders' => $this->accepting_orders,
            'products_count' => $this->whenCounted('products'),
            'orders_count' => $this->whenCounted('orders'),
            'staff_count' => $this->whenCounted('staff'),
            'delivered_sales' => $this->whenHas('delivered_sales', fn ($value): float => (float) $value),
            'last_order_at' => $this->whenHas('orders_max_created_at', fn ($value): ?string => $value ? Carbon::parse($value)->toIso8601String() : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
