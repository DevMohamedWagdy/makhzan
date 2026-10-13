<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreSettingsTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    public function test_saves_each_settings_tab_without_touching_the_others(): void
    {
        $this->patchJson('/api/v1/vendor/store', ['name' => 'نور للأزياء', 'description' => 'أزياء نسائية', 'governorate_id' => 'giza', 'city_id' => 'dokki'])->assertOk();
        $this->patchJson('/api/v1/vendor/store', ['whatsapp' => '0101 234 5678', 'instagram_url' => 'https://instagram.com/noor'])->assertOk();
        $this->patchJson('/api/v1/vendor/store', ['accepting_orders' => false, 'closed_message' => 'إجازة العيد', 'min_order_total' => 200])->assertOk();
        $this->patchJson('/api/v1/vendor/store', ['return_policy' => 'الاسترجاع خلال 14 يوماً'])->assertOk();

        $this->getJson('/api/v1/vendor/store')
            ->assertOk()
            ->assertJsonPath('data.name', 'نور للأزياء')
            ->assertJsonPath('data.description', 'أزياء نسائية')
            ->assertJsonPath('data.whatsapp', '01012345678')
            ->assertJsonPath('data.instagram_url', 'https://instagram.com/noor')
            ->assertJsonPath('data.accepting_orders', false)
            ->assertJsonPath('data.min_order_total', 200)
            ->assertJsonPath('data.return_policy', 'الاسترجاع خلال 14 يوماً')
            ->assertJsonPath('data.slug', $this->vendor->store->slug);
    }

    public function test_validates_settings_and_never_changes_the_address(): void
    {
        $slug = $this->vendor->store->slug;

        $this->patchJson('/api/v1/vendor/store', ['name' => '', 'whatsapp' => '123', 'facebook_url' => 'facebook'])->assertJsonValidationErrors(['name', 'whatsapp', 'facebook_url']);
        $this->patchJson('/api/v1/vendor/store', ['slug' => 'another-store'])->assertOk();

        $this->assertSame($slug, $this->vendor->store->fresh()->slug);
    }

    public function test_replaces_and_removes_the_logo(): void
    {
        Storage::fake('public');

        $first = $this->postJson('/api/v1/vendor/store/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertOk()->json('data.logo_url');
        $firstPath = $this->vendor->store->fresh()->logo_path;
        $this->postJson('/api/v1/vendor/store/logo', ['logo' => UploadedFile::fake()->image('new.png')])->assertOk();

        Storage::disk('public')->assertMissing($firstPath);
        $this->assertNotNull($first);

        $this->deleteJson('/api/v1/vendor/store/logo')->assertOk()->assertJsonPath('data.logo_url', null);
        $this->postJson('/api/v1/vendor/store/logo', ['logo' => UploadedFile::fake()->create('logo.pdf')])->assertJsonValidationErrors('logo');
    }

    public function test_updates_the_vendors_profile_keeping_phone_and_email_unique(): void
    {
        Vendor::factory()->create(['phone' => '01099999999', 'email' => 'taken@example.com']);

        $this->putJson('/api/v1/vendor/auth/profile', ['full_name' => 'محمد وجدي', 'phone' => '01011112222', 'email' => 'OWNER@example.com'])
            ->assertOk()
            ->assertJsonPath('data.full_name', 'محمد وجدي')
            ->assertJsonPath('data.email', 'owner@example.com');

        $this->putJson('/api/v1/vendor/auth/profile', ['full_name' => 'x', 'phone' => '01099999999', 'email' => 'taken@example.com'])->assertJsonValidationErrors(['phone', 'email']);
    }

    public function test_changing_the_password_signs_out_other_sessions(): void
    {
        // Authenticate with real tokens, not setUp()'s acting-as vendor.
        $this->app['auth']->forgetGuards();
        $vendor = Vendor::factory()->withStore()->create(['password' => 'password1']);
        $vendor->createToken('other-device', [Vendor::TOKEN_ABILITY]);
        $token = $vendor->createToken('this-device', [Vendor::TOKEN_ABILITY])->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/vendor/auth/password', ['current_password' => 'wrong', 'password' => 'newpass12', 'password_confirmation' => 'newpass12'])->assertJsonValidationErrors('current_password');
        $this->withToken($token)->putJson('/api/v1/vendor/auth/password', ['current_password' => 'password1', 'password' => 'newpass12', 'password_confirmation' => 'newpass12'])->assertOk();

        $this->assertTrue(Hash::check('newpass12', $vendor->fresh()->password));
        $this->assertSame(['this-device'], $vendor->tokens()->pluck('name')->all());
    }

    public function test_the_storefront_shows_contact_social_announcement_and_policies(): void
    {
        $store = $this->vendor->store;
        $store->update(['whatsapp' => '01012345678', 'facebook_url' => 'https://facebook.com/noor', 'announcement' => 'شحن مجاني هذا الأسبوع', 'shipping_policy' => 'التوصيل خلال 3 أيام']);

        $this->getJson("/api/v1/storefront/{$store->slug}")
            ->assertOk()
            ->assertJsonPath('store.contact.whatsapp', '01012345678')
            ->assertJsonPath('store.social', ['facebook' => 'https://facebook.com/noor'])
            ->assertJsonPath('store.announcement', 'شحن مجاني هذا الأسبوع')
            ->assertJsonPath('store.accepting_orders', true)
            ->assertJsonPath('store.policies', [['key' => 'shipping', 'title' => 'سياسة الشحن والتوصيل']]);

        $this->getJson("/api/v1/storefront/{$store->slug}/policies/shipping")->assertOk()->assertJsonPath('body', 'التوصيل خلال 3 أيام');
        $this->getJson("/api/v1/storefront/{$store->slug}/policies/returns")->assertNotFound();
    }

    public function test_a_paused_store_or_a_small_order_cannot_check_out(): void
    {
        Notification::fake();
        $store = $this->vendor->store;
        $store->forceFill(['default_shipping_price' => 50])->save();
        $variant = Product::factory()->for($store)->create()->variants()->first();
        $variant->update(['price' => 100, 'stock' => 10]);
        $order = fn (int $quantity) => $this->postJson("/api/v1/storefront/{$store->slug}/customer/orders", [
            'items' => [['variant_id' => $variant->id, 'quantity' => $quantity]],
            'address' => ['recipient_name' => 'منى', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
        ]);

        Sanctum::actingAs(Customer::factory()->for($store)->create(), [Customer::TOKEN_ABILITY]);

        $store->update(['accepting_orders' => false, 'closed_message' => 'إجازة العيد، نعود يوم الأحد']);
        $order(1)->assertJsonValidationErrors(['store' => 'إجازة العيد، نعود يوم الأحد']);

        $store->update(['accepting_orders' => true, 'min_order_total' => 250]);
        $order(2)->assertJsonValidationErrors(['items' => 'أقل قيمة للطلب 250.00 ج.م، أضف منتجات بقيمة 50.00 ج.م']);
        $order(3)->assertCreated();

        $this->assertSame(7, $variant->fresh()->stock);
    }
}
