<?php

namespace Database\Seeders;

use App\Enums\PlanFeature;
use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Starter plans (there is no free plan: new stores get a trial instead). Safe to run on production: existing plans (by slug) are left as they are.
 */
class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            ['slug' => 'pro', 'name' => 'احترافية', 'description' => 'للمتاجر النامية مع المسوقين والدفع أونلاين', 'price_monthly' => 299, 'price_yearly' => 2990, 'max_products' => 500, 'max_staff' => 3, 'features' => [PlanFeature::Affiliates, PlanFeature::OnlinePayments], 'position' => 2],
            ['slug' => 'business', 'name' => 'أعمال', 'description' => 'منتجات بلا حدود وفريق أكبر ودومين خاص', 'price_monthly' => 699, 'price_yearly' => 6990, 'max_products' => null, 'max_staff' => 15, 'features' => PlanFeature::cases(), 'position' => 3],
        ];

        foreach ($plans as $plan) {
            Plan::query()->firstOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
