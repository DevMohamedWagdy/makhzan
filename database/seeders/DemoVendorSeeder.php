<?php

namespace Database\Seeders;

use App\Enums\AffiliateTier;
use App\Enums\CommissionType;
use App\Models\Affiliate;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

/**
 * Demo vendor with a store, affiliates and a staff member for trying the dashboard locally.
 * Local use only.
 */
class DemoVendorSeeder extends Seeder
{
    public const EMAIL = 'vendor@makhzan.app';

    public const PASSWORD = 'Makhzan@2026';

    /** Demo affiliate login for /noor-fashion/affiliates/login. */
    public const AFFILIATE_PHONE = '01011112233';

    public const AFFILIATE_PASSWORD = 'Affiliate@2026';

    /** Second vendor account for local testing, with its own store and data. */
    public const OWNER_EMAIL = 'wagdy@gmail.com';

    public const OWNER_PASSWORD = 'Mm@123456';

    /** Demo staff member of noor-fashion: orders and stock, without deleting or reports. */
    public const STAFF_EMAIL = 'staff@makhzan.app';

    public const STAFF_PASSWORD = 'Staff@2026';

    /** Stores the catalog and orders seeders fill. */
    public const STORE_SLUGS = ['noor-fashion', 'wagdy-store'];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vendor = Vendor::query()->firstWhere('email', self::EMAIL) ?? $this->seedVendorWithAffiliates(
            ['full_name' => 'محمد وجدي', 'phone' => '01001234567', 'email' => self::EMAIL, 'password' => self::PASSWORD],
            ['name' => 'نور للأزياء', 'slug' => 'noor-fashion'],
        );

        $this->seedDemoAffiliate($vendor);
        $this->seedDemoStaff($vendor);

        if (! Vendor::query()->where('email', self::OWNER_EMAIL)->exists()) {
            $this->seedVendorWithAffiliates(
                ['full_name' => 'وجدي', 'phone' => '01009876543', 'email' => self::OWNER_EMAIL, 'password' => self::OWNER_PASSWORD],
                ['name' => 'متجر وجدي', 'slug' => 'wagdy-store'],
            );
        }

        $this->subscribeDemoStores();
    }

    /**
     * Demo stores get the top plan for a year, so every feature can be tried locally.
     */
    private function subscribeDemoStores(): void
    {
        $plan = Plan::query()->orderByDesc('price_monthly')->first();

        if (! $plan) {
            return;
        }

        Store::query()
            ->whereIn('slug', self::STORE_SLUGS)
            ->where(fn ($query) => $query->whereNull('plan_expires_at')->orWhere('plan_expires_at', '<=', now()))
            ->update(['plan_id' => $plan->id, 'plan_expires_at' => now()->addYear()]);
    }

    private function seedDemoStaff(Vendor $vendor): void
    {
        if (Vendor::query()->where('email', self::STAFF_EMAIL)->exists()) {
            return;
        }

        $role = $vendor->store->roles()->firstOrCreate(['name' => 'موظف طلبات ومخزن'], [
            'description' => 'يتابع الطلبات ويشحنها ويعدّل المخزون، دون حذف أو تقارير',
            'permissions' => ['orders.view', 'orders.update', 'orders.ship', 'inventory.view', 'inventory.update'],
        ]);

        $vendor->store->staff()->create([
            'full_name' => 'أحمد سمير',
            'job_title' => 'مسؤول الطلبات والمخزن',
            'phone' => '01022223333',
            'email' => self::STAFF_EMAIL,
            'password' => self::STAFF_PASSWORD,
            'role_id' => $role->id,
        ]);
    }

    private function seedDemoAffiliate(Vendor $vendor): void
    {
        if ($vendor->store->affiliates()->where('phone', self::AFFILIATE_PHONE)->exists()) {
            return;
        }

        // Orders, sales, commissions and payouts come from DemoOrdersSeeder.
        Affiliate::factory()->for($vendor)->for($vendor->store)->tier(AffiliateTier::General)->create([
            'full_name' => 'سارة محمود إبراهيم',
            'phone' => self::AFFILIATE_PHONE,
            'email' => 'sara.affiliate@example.com',
            'password' => self::AFFILIATE_PASSWORD,
            'payout_account_name' => 'سارة محمود',
            'payout_account_number' => self::AFFILIATE_PHONE,
        ]);
    }

    /**
     * @param  array{full_name: string, phone: string, email: string, password: string}  $account
     * @param  array{name: string, slug: string}  $storeDetails
     */
    private function seedVendorWithAffiliates(array $account, array $storeDetails): Vendor
    {
        $vendor = Vendor::factory()->create($account);

        $store = Store::factory()->for($vendor)->create([
            ...$storeDetails,
            'governorate_id' => 'cairo',
            'city_id' => 'nasr_city',
        ]);

        $arabic = fake('ar_EG');
        $affiliates = Affiliate::factory()->for($vendor)->for($store)->state(function () use ($arabic): array {
            $name = $arabic->firstName().' '.$arabic->lastName();

            return ['full_name' => $name, 'payout_account_name' => $name];
        });

        $affiliates->count(18)->create();
        $affiliates->count(6)->tier(AffiliateTier::New)->create();
        $affiliates->count(4)->tier(AffiliateTier::Vip)->bankPayout()->create();
        $affiliates->count(2)->withCustomCommission(CommissionType::Percentage, 11, 'اتفاق خاص لموسم الصيف')->create();
        $affiliates->count(4)->frozen()->create();
        $affiliates->count(4)->pending()->tier(AffiliateTier::New)->create();

        return $vendor;
    }
}
