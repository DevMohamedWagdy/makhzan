<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Vendor;
use App\Notifications\StoreAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreAlertNotificationTest extends TestCase
{
    use RefreshDatabase;

    private const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

    private const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    private function sent(Vendor $vendor, string $event): bool
    {
        return Notification::sent($vendor, StoreAlertNotification::class)->contains(fn (StoreAlertNotification $notification): bool => $notification->event === $event);
    }

    public function test_the_owner_is_told_when_the_platform_suspends_and_reopens_the_store(): void
    {
        Notification::fake();
        $owner = Vendor::factory()->withStore()->create();
        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);

        $this->postJson("/api/v1/admin/stores/{$owner->store->id}/suspend", ['reason' => 'مخالفة الشروط'])->assertOk();
        Notification::assertSentTo($owner, StoreAlertNotification::class, fn (StoreAlertNotification $notification, array $channels): bool => $notification->event === StoreAlertNotification::STORE_SUSPENDED
            && $notification->details['reason'] === 'مخالفة الشروط'
            && $channels === ['mail', 'database']);

        $this->postJson("/api/v1/admin/stores/{$owner->store->id}/unsuspend")->assertOk();
        $this->assertTrue($this->sent($owner, StoreAlertNotification::STORE_REACTIVATED));
    }

    public function test_the_owner_is_told_when_a_coupon_is_used_up(): void
    {
        Notification::fake();
        $owner = Vendor::factory()->withStore()->create();
        $owner->store->update(['slug' => 'noor-fashion']);
        $owner->store->forceFill(['default_shipping_price' => 60])->save();
        $variant = Product::factory()->for($owner->store)->create()->variants()->first();
        $variant->update(['price' => 400, 'stock' => 20]);
        Coupon::factory()->for($owner->store)->create(['code' => 'ONCE', 'usage_limit' => 1]);
        Sanctum::actingAs(Customer::factory()->for($owner->store)->create(), [Customer::TOKEN_ABILITY]);

        $this->postJson('/api/v1/storefront/noor-fashion/customer/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            'coupon_code' => 'ONCE',
        ])->assertCreated();

        Notification::assertSentTo($owner, StoreAlertNotification::class, fn (StoreAlertNotification $notification, array $channels): bool => $notification->event === StoreAlertNotification::COUPON_USED_UP
            && $notification->details['code'] === 'ONCE'
            && $channels === ['database']);
    }

    public function test_recently_expired_coupons_are_announced_once(): void
    {
        Notification::fake();
        $owner = Vendor::factory()->withStore()->create();
        $justEnded = Coupon::factory()->for($owner->store)->create(['code' => 'FLASH', 'ends_at' => now()->subHour()]);
        $longGone = Coupon::factory()->for($owner->store)->create(['code' => 'OLD', 'ends_at' => now()->subDays(5)]);
        Coupon::factory()->for($owner->store)->create(['code' => 'LATER', 'ends_at' => now()->addDay()]);

        $this->artisan('makhzan:notify-expired-coupons')->assertSuccessful();
        $this->artisan('makhzan:notify-expired-coupons')->assertSuccessful();

        Notification::assertSentToTimes($owner, StoreAlertNotification::class, 1);
        Notification::assertSentTo($owner, StoreAlertNotification::class, fn (StoreAlertNotification $notification): bool => $notification->event === StoreAlertNotification::COUPON_EXPIRED && $notification->details['code'] === 'FLASH');
        $this->assertNotNull($justEnded->fresh()->expiry_notified_at);
        $this->assertNotNull($longGone->fresh()->expiry_notified_at);
    }

    public function test_the_owner_is_told_about_sign_ins_from_a_new_device_only(): void
    {
        Notification::fake();
        $owner = Vendor::factory()->withStore()->create(['email' => 'owner@noor.test']);
        $signIn = fn (string $userAgent) => $this->withHeader('User-Agent', $userAgent)->postJson('/api/v1/vendor/auth/login', ['email' => 'owner@noor.test', 'password' => 'password1'])->assertOk();

        $signIn(self::CHROME_WINDOWS);
        $signIn(self::CHROME_WINDOWS);
        Notification::assertNotSentTo($owner, StoreAlertNotification::class);

        $signIn(self::SAFARI_IPHONE);
        Notification::assertSentTo($owner, StoreAlertNotification::class, fn (StoreAlertNotification $notification): bool => $notification->event === StoreAlertNotification::NEW_SIGN_IN
            && $notification->details['device'] === 'Safari على iOS');
    }

    public function test_the_owner_is_told_when_their_password_changes(): void
    {
        Notification::fake();
        $owner = Vendor::factory()->withStore()->create(['email' => 'owner@noor.test']);
        $token = $this->postJson('/api/v1/vendor/auth/login', ['email' => 'owner@noor.test', 'password' => 'password1'])->json('token');

        $this->withToken($token)->putJson('/api/v1/vendor/auth/password', ['current_password' => 'password1', 'password' => 'NewPass2026x', 'password_confirmation' => 'NewPass2026x'])->assertOk();

        $this->assertTrue($this->sent($owner, StoreAlertNotification::PASSWORD_CHANGED));
    }

    public function test_alerts_read_well_in_the_bell_and_coupon_ones_reach_staff_who_manage_coupons(): void
    {
        $owner = Vendor::factory()->withStore()->create();
        $owner->notify(new StoreAlertNotification(StoreAlertNotification::COUPON_EXPIRED, ['coupon_id' => 1, 'code' => 'FLASH']));
        $owner->notify(new StoreAlertNotification(StoreAlertNotification::STORE_REACTIVATED));
        $staff = $owner->store->staff()->create([
            'full_name' => 'أحمد سمير', 'job_title' => 'تسويق', 'phone' => '01077778888', 'email' => 'ahmed@noor.test', 'password' => 'Staff2026pass',
            'role_id' => $owner->store->roles()->create(['name' => 'تسويق', 'permissions' => ['notifications.view', 'coupons.view']])->id,
        ]);

        Sanctum::actingAs($owner, [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['message' => 'أعادت إدارة المنصة تفعيل متجرك، وأصبح ظاهراً للعملاء ويستقبل الطلبات من جديد.'])
            ->assertJsonFragment(['message' => 'انتهت مدة الكوبون FLASH ولم يعد يعمل في المتجر.']);

        Sanctum::actingAs($staff, [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/notifications')->assertOk()->assertJsonPath('data.*.type', ['coupon_expired']);
    }
}
