<?php

namespace Database\Seeders;

use App\Enums\AffiliateTier;
use App\Enums\CommissionType;
use App\Models\Affiliate;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

/**
 * Demo vendor matching the frontend's mock account (resources/js/services/mock/data.js),
 * so the SPA behaves the same against the mock and the real API. Local use only.
 */
class DemoVendorSeeder extends Seeder
{
    public const EMAIL = 'vendor@makhzan.app';

    public const PASSWORD = 'Makhzan@2026';

    /** Demo affiliate login for /noor-fashion/affiliates/login. */
    public const AFFILIATE_PHONE = '01011112233';

    public const AFFILIATE_PASSWORD = 'Affiliate@2026';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vendor = Vendor::query()->firstWhere('email', self::EMAIL) ?? $this->seedVendorWithAffiliates();

        $this->seedDemoAffiliate($vendor);
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

    private function seedVendorWithAffiliates(): Vendor
    {
        $vendor = Vendor::factory()->create([
            'full_name' => 'محمد وجدي',
            'phone' => '01001234567',
            'email' => self::EMAIL,
            'password' => self::PASSWORD,
        ]);

        $store = Store::factory()->for($vendor)->create([
            'name' => 'نور للأزياء',
            'slug' => 'noor-fashion',
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
