<?php

namespace Tests\Feature;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Link previews and crawlers read the first HTML response, so the SPA shell must carry the
 * store's or product's own title, text and picture.
 */
class PageMetaTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::factory()->create(['name' => 'نور للأزياء', 'slug' => 'noor-fashion', 'description' => 'أزياء <b>محتشمة</b> بأسعار مناسبة']);
    }

    public function test_a_product_link_carries_the_product_name_text_and_image(): void
    {
        $product = Product::factory()->for($this->store)->create(['name' => 'فستان سهرة', 'slug' => 'evening-dress', 'description' => 'فستان من الشيفون']);
        ProductImage::factory()->for($product)->create(['path' => 'stores/1/products/dress.jpg']);

        $this->get('/noor-fashion/p/evening-dress')
            ->assertOk()
            ->assertSee('<title>فستان سهرة | نور للأزياء</title>', false)
            ->assertSee('<meta property="og:description" content="فستان من الشيفون">', false)
            ->assertSee('<meta property="og:image" content="'.asset('storage/stores/1/products/dress.jpg').'">', false)
            ->assertSee('<meta property="og:type" content="product">', false)
            ->assertSee('<meta property="og:url" content="'.$this->store->storefrontUrl('/p/evening-dress').'">', false);
    }

    public function test_store_pages_carry_the_store_name_and_plain_description(): void
    {
        foreach (['/noor-fashion', '/noor-fashion/products', '/noor-fashion/cart'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('<title>نور للأزياء</title>', false)
                ->assertSee('<meta name="description" content="أزياء محتشمة بأسعار مناسبة">', false);
        }
    }

    public function test_hidden_or_unknown_products_fall_back_to_the_store(): void
    {
        Product::factory()->for($this->store)->create(['slug' => 'draft-dress', 'status' => ProductStatus::Draft]);
        Product::factory()->for(Store::factory())->create(['slug' => 'other-dress']);

        foreach (['/noor-fashion/p/draft-dress', '/noor-fashion/p/other-dress', '/noor-fashion/p/missing'] as $path) {
            $this->get($path)->assertOk()->assertSee('<title>نور للأزياء</title>', false);
        }
    }

    public function test_a_store_on_its_own_domain_gets_its_meta(): void
    {
        $this->store->forceFill(['custom_domain' => 'shop.noor.com', 'custom_domain_verified_at' => now()])->save();
        Product::factory()->for($this->store)->create(['name' => 'فستان سهرة', 'slug' => 'evening-dress']);

        $this->get('http://shop.noor.com/')->assertOk()->assertSee('<title>نور للأزياء</title>', false);
        $this->get('http://shop.noor.com/p/evening-dress')
            ->assertOk()
            ->assertSee('<title>فستان سهرة | نور للأزياء</title>', false)
            ->assertSee('<link rel="canonical" href="https://shop.noor.com/p/evening-dress">', false);
    }

    public function test_platform_pages_and_suspended_stores_get_the_platform_meta(): void
    {
        $suspended = Store::factory()->create(['slug' => 'closed-shop', 'suspended_at' => now()]);

        foreach (['/', '/login', '/dashboard/orders', '/'.$suspended->slug] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('<title>Sellygrow | كل ما يحتاجه متجرك في منصة واحدة</title>', false)
                ->assertSee('<meta property="og:image" content="'.asset('og-image.png').'">', false);
        }
    }
}
