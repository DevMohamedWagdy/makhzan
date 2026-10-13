<?php

namespace App\Http\Resources;

use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A coupon for the vendor, with its state and, when loaded through the list query, its
 * uses (orders not cancelled), discount given and sales.
 *
 * @mixin Coupon
 */
class CouponResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $uses = isset($this->uses_count) ? (int) $this->uses_count : null;

        return [
            'coupon_id' => $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'type' => $this->type,
            'value' => $this->value,
            'max_discount' => $this->max_discount,
            'min_subtotal' => $this->min_subtotal,
            'applies_to' => $this->applies_to,
            'product_ids' => $this->product_ids ?? [],
            'category_ids' => $this->category_ids ?? [],
            // Names for the edit form; only on a single coupon (show, create, update), not in lists.
            'targets' => $this->when($request->route('coupon') !== null || $request->isMethod('POST'), fn (): array => $this->targets()),
            'usage_limit' => $this->usage_limit,
            'per_customer_limit' => $this->per_customer_limit,
            'first_order_only' => $this->first_order_only,
            'affiliate' => $this->affiliate ? ['affiliate_id' => $this->affiliate->id, 'full_name' => $this->affiliate->full_name] : null,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'state' => $this->state($uses),
            'stats' => $this->when($uses !== null, fn (): array => [
                'uses' => $uses,
                'discount_total' => round((float) $this->discount_total + (float) $this->shipping_discount_total, 2),
                'sales_total' => round((float) $this->sales_total, 2),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{products: list<array{product_id: int, name: string}>, categories: list<array{category_id: int, name: string}>}
     */
    private function targets(): array
    {
        return [
            'products' => Product::query()->whereIn('id', $this->product_ids ?? [])->where('store_id', $this->store_id)->get(['id', 'name'])
                ->map(fn (Product $product): array => ['product_id' => $product->id, 'name' => $product->name])->all(),
            'categories' => ProductCategory::query()->whereIn('id', $this->category_ids ?? [])->where('store_id', $this->store_id)->get(['id', 'name'])
                ->map(fn (ProductCategory $category): array => ['category_id' => $category->id, 'name' => $category->name])->all(),
        ];
    }
}
