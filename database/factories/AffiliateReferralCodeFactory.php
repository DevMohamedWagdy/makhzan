<?php

namespace Database\Factories;

use App\Models\Affiliate;
use App\Models\AffiliateReferralCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AffiliateReferralCode>
 */
class AffiliateReferralCodeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'affiliate_id' => Affiliate::factory(),
            'store_id' => fn (array $attributes) => Affiliate::find($attributes['affiliate_id'])->store_id,
            'code' => 'MK'.fake()->unique()->bothify('####??'),
            'is_active' => true,
        ];
    }
}
