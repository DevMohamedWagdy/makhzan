<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Models\Affiliate;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductCollection;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private ProductCategory $dresses;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::factory()->create(['slug' => 'noor-fashion']);
        $this->dresses = ProductCategory::factory()->for($this->store)->create(['name' => 'فساتين', 'slug' => 'dresses', 'position' => 1]);
    }

    private function product(array $attributes = [], ?ProductCategory $category = null): Product
    {
        return Product::factory()->for($this->store)->create(['category_id' => ($category ?? $this->dresses)->id, ...$attributes]);
    }

    public function test_home_lists_only_what_shoppers_can_see(): void
    {
        $featured = $this->product(['is_featured' => true]);
        $regular = $this->product();
        $this->product()->update(['status' => 'draft']);
        $hiddenCategory = ProductCategory::factory()->for($this->store)->create(['is_active' => false]);
        $this->product([], $hiddenCategory);
        ProductCategory::factory()->for($this->store)->create(['name' => 'فارغ']);

        $this->getJson('/api/v1/storefront/noor-fashion')
            ->assertOk()
            ->assertJsonPath('store.slug', 'noor-fashion')
            ->assertJsonPath('categories.*.slug', ['dresses'])
            ->assertJsonPath('categories.0.products_count', 2)
            ->assertJsonPath('featured.*.product_id', [$featured->id])
            ->assertJsonCount(2, 'latest')
            ->assertJsonPath('latest.0.product_id', $regular->id);
    }

    public function test_home_lists_active_collections_with_their_visible_products_in_order(): void
    {
        $first = $this->product();
        $second = $this->product();
        $draft = $this->product(['status' => 'draft']);
        $offers = ProductCollection::factory()->for($this->store)->create(['name' => 'أحدث العروض', 'position' => 1]);
        $offers->products()->attach([$second->id => ['position' => 0], $first->id => ['position' => 1], $draft->id => ['position' => 2]]);
        ProductCollection::factory()->for($this->store)->hidden()->create()->products()->attach($first);
        ProductCollection::factory()->for($this->store)->create(['name' => 'فارغ'])->products()->attach($draft);
        ProductCollection::factory()->create()->products()->attach(Product::factory()->create());

        $this->getJson('/api/v1/storefront/noor-fashion')
            ->assertOk()
            ->assertJsonCount(1, 'collections')
            ->assertJsonPath('collections.0.name', 'أحدث العروض')
            ->assertJsonPath('collections.0.products.*.product_id', [$second->id, $first->id])
            ->assertJsonPath('collections.0.products.0.category.slug', 'dresses');
    }

    public function test_lists_products_by_category_search_and_price(): void
    {
        $bags = ProductCategory::factory()->for($this->store)->create(['slug' => 'bags']);
        $cheap = $this->product(['name' => 'فستان قطن']);
        $cheap->variants()->update(['price' => 300]);
        $expensive = $this->product(['name' => 'فستان سهرة']);
        $expensive->variants()->update(['price' => 1500]);
        $bag = $this->product(['name' => 'شنطة'], $bags);
        $bag->variants()->update(['price' => 700]);

        $this->getJson('/api/v1/storefront/noor-fashion/products?sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.*.product_id', [$cheap->id, $bag->id, $expensive->id])
            ->assertJsonPath('category', null);

        $this->getJson('/api/v1/storefront/noor-fashion/products?category=dresses&sort=price_desc')
            ->assertJsonPath('data.*.product_id', [$expensive->id, $cheap->id])
            ->assertJsonPath('category.slug', 'dresses');

        $this->getJson('/api/v1/storefront/noor-fashion/products?search='.urlencode('سهرة'))->assertJsonPath('data.*.product_id', [$expensive->id]);
    }

    public function test_a_hidden_category_returns_404(): void
    {
        ProductCategory::factory()->for($this->store)->create(['slug' => 'hidden', 'is_active' => false]);

        $this->getJson('/api/v1/storefront/noor-fashion/products?category=hidden')->assertNotFound();
    }

    public function test_product_page_shows_availability_without_exact_stock(): void
    {
        $product = $this->product(['description' => 'ستان'], null);
        $product->update(['options' => [['name' => 'المقاس', 'values' => ['S', 'M', 'L']]]]);
        $product->variants()->delete();
        $product->variants()->createMany([
            ['option_values' => ['S'], 'price' => 900, 'compare_at_price' => 1200, 'stock' => 25, 'position' => 0],
            ['option_values' => ['M'], 'price' => 900, 'stock' => 2, 'position' => 1],
            ['option_values' => ['L'], 'price' => 950, 'stock' => 0, 'position' => 2],
        ]);
        $related = $this->product();

        $this->getJson("/api/v1/storefront/noor-fashion/products/{$product->slug}")
            ->assertOk()
            ->assertJsonPath('product.description', 'ستان')
            ->assertJsonPath('product.price', 900)
            ->assertJsonPath('product.discount_percent', 25)
            ->assertJsonPath('product.in_stock', true)
            ->assertJsonPath('product.variants.0.stock_left', null)
            ->assertJsonPath('product.variants.1.stock_left', 2)
            ->assertJsonPath('product.variants.2.available', false)
            ->assertJsonMissingPath('product.variants.0.stock')
            ->assertJsonPath('related.*.product_id', [$related->id]);
    }

    public function test_unpublished_or_foreign_products_return_404(): void
    {
        $draft = $this->product(['status' => 'draft']);
        $foreign = Product::factory()->create();

        $this->getJson("/api/v1/storefront/noor-fashion/products/{$draft->slug}")->assertNotFound();
        $this->getJson("/api/v1/storefront/noor-fashion/products/{$foreign->slug}")->assertNotFound();
        $this->getJson('/api/v1/storefront/unknown-store')->assertNotFound();
    }

    public function test_counts_clicks_only_for_active_codes_of_the_store(): void
    {
        $affiliate = Affiliate::factory()->for($this->store->vendor)->for($this->store)->create();
        $code = $affiliate->referralCodes()->first();
        $foreignCode = Affiliate::factory()->create()->referralCodes()->first();

        $this->postJson('/api/v1/storefront/noor-fashion/referral-clicks', ['code' => $code->code])->assertOk()->assertJson(['valid' => true]);
        $this->postJson('/api/v1/storefront/noor-fashion/referral-clicks', ['code' => $foreignCode->code])->assertJson(['valid' => false]);

        $affiliate->freeze('test');
        $this->postJson('/api/v1/storefront/noor-fashion/referral-clicks', ['code' => $code->code])->assertJson(['valid' => false]);

        $this->assertSame(1, $code->fresh()->clicks);
        $this->assertSame(0, $foreignCode->fresh()->clicks);
    }

    public function test_quotes_the_cart_with_current_prices_and_stock(): void
    {
        $product = $this->product(['name' => 'فستان']);
        $variant = $product->variants()->first();
        $variant->update(['price' => 500, 'stock' => 3]);
        $soldOut = $this->product()->variants()->first();
        $soldOut->update(['stock' => 0]);
        $draftVariant = $this->product(['status' => 'draft'])->variants()->first();

        $this->postJson('/api/v1/storefront/noor-fashion/cart/quote', ['items' => [
            ['variant_id' => $variant->id, 'quantity' => 5],
            ['variant_id' => $soldOut->id, 'quantity' => 1],
            ['variant_id' => $draftVariant->id, 'quantity' => 1],
        ]])
            ->assertOk()
            ->assertJsonPath('lines.0.status', 'insufficient')
            ->assertJsonPath('lines.0.available_quantity', 3)
            ->assertJsonPath('lines.0.line_total', 1500)
            ->assertJsonPath('lines.0.name', 'فستان')
            ->assertJsonPath('lines.1.status', 'out_of_stock')
            ->assertJsonPath('lines.2.status', 'unavailable')
            ->assertJsonPath('subtotal', 1500)
            ->assertJsonPath('items_count', 3);
    }
}
