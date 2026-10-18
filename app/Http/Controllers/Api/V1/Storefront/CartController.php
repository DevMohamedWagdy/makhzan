<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\QuoteCartRequest;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class CartController extends Controller
{
    /**
     * Prices and availability for the cart kept in the shopper's browser. Each line is
     * "ok", "insufficient" (fewer left than requested), "out_of_stock" or "unavailable"
     * (removed, unpublished or another store's); only the first two count in the subtotal.
     */
    public function quote(QuoteCartRequest $request, Store $store): JsonResponse
    {
        $items = collect($request->validated('items'));

        $variants = ProductVariant::query()
            ->whereIn('id', $items->pluck('variant_id'))
            ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
            ->with(['product.images', 'product.category'])
            ->get()
            ->keyBy('id');

        $lines = $items->map(function (array $item) use ($variants): array {
            $variant = $variants->get($item['variant_id']);

            if (! $variant) {
                return ['variant_id' => $item['variant_id'], 'quantity' => $item['quantity'], 'status' => 'unavailable', 'line_total' => 0];
            }

            $available = min($item['quantity'], $variant->stock);
            $status = match (true) {
                $variant->stock === 0 => 'out_of_stock',
                $variant->stock < $item['quantity'] => 'insufficient',
                default => 'ok',
            };

            return [
                'variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'product_slug' => $variant->product->slug,
                'name' => $variant->product->translated('name'),
                'variant_title' => $variant->title(),
                'image_url' => $variant->product->images->first()?->url,
                'unit_price' => $variant->price,
                'compare_at_price' => $variant->compare_at_price,
                'quantity' => $item['quantity'],
                'available_quantity' => $available,
                'status' => $status,
                'line_total' => round($variant->price * $available, 2),
            ];
        })->values();

        return response()->json([
            'lines' => $lines,
            'subtotal' => round($lines->sum('line_total'), 2),
            'items_count' => $lines->whereIn('status', ['ok', 'insufficient'])->sum('available_quantity'),
        ]);
    }
}
