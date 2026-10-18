<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Support\Str;

/**
 * The <title>, description and Open Graph tags the server puts in the SPA shell.
 *
 * Crawlers and link previews (Google, WhatsApp, Facebook) read the first HTML response and
 * don't run the React app, so a shared store or product link has to carry its own name,
 * text and picture here; everything else gets the platform's tags.
 */
class PageMeta
{
    public const PLATFORM_NAME = 'Sellygrow';

    /**
     * @return array{title: string, description: string, image: string, url: string, type: string, site_name: string}
     */
    public function forPath(string $path, ?string $storeDomainSlug = null): array
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/')), fn (string $segment): bool => $segment !== ''));

        // On a store's own domain every path belongs to that store.
        $storeSlug = $storeDomainSlug ?? array_shift($segments);
        $isPlatformPage = $storeDomainSlug === null && in_array($storeSlug, config('makhzan.reserved_slugs'), true);
        $store = $storeSlug !== null && ! $isPlatformPage ? $this->findStore($storeSlug) : null;

        if (! $store) {
            return $this->platform();
        }

        if (($segments[0] ?? null) === 'p' && isset($segments[1])) {
            $product = $store->products()->visibleInStore()->with('images')->where('slug', $segments[1])->first();

            if ($product) {
                return $this->product($store, $product);
            }
        }

        return $this->store($store);
    }

    /**
     * @return array{title: string, description: string, image: string, url: string, type: string, site_name: string}
     */
    public function platform(): array
    {
        return [
            'title' => self::PLATFORM_NAME.' | كل ما يحتاجه متجرك في منصة واحدة',
            'description' => 'منصة متكاملة لإدارة تجارتك: متجر إلكتروني، المخزون، الطلبات، المسوقين والتقارير، مصممة للتاجر العربي.',
            'image' => asset('og-image.png'),
            'url' => url()->current(),
            'type' => 'website',
            'site_name' => self::PLATFORM_NAME,
        ];
    }

    private function findStore(string $slug): ?Store
    {
        return Store::query()->where('slug', $slug)->whereNull('suspended_at')->first();
    }

    /**
     * @return array{title: string, description: string, image: string, url: string, type: string, site_name: string}
     */
    private function store(Store $store): array
    {
        return [
            'title' => $store->name,
            'description' => $this->plain($store->description) ?: 'تسوّق من '.$store->name.' أونلاين.',
            'image' => $store->logo_url ?? asset('og-image.png'),
            'url' => $store->storefrontUrl(),
            'type' => 'website',
            'site_name' => $store->name,
        ];
    }

    /**
     * @return array{title: string, description: string, image: string, url: string, type: string, site_name: string}
     */
    private function product(Store $store, Product $product): array
    {
        return [
            'title' => $product->name.' | '.$store->name,
            'description' => $this->plain($product->description) ?: $product->name.' من '.$store->name.'.',
            'image' => $product->images->first()?->url ?? $store->logo_url ?? asset('og-image.png'),
            'url' => $store->storefrontUrl('/p/'.$product->slug),
            'type' => 'product',
            'site_name' => $store->name,
        ];
    }

    /**
     * One line of plain text, short enough for a preview card.
     */
    private function plain(?string $text): string
    {
        return Str::limit(Str::squish(strip_tags((string) $text)), 160);
    }
}
