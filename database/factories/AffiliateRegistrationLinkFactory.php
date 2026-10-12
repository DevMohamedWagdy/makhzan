<?php

namespace Database\Factories;

use App\Models\AffiliateRegistrationLink;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AffiliateRegistrationLink>
 */
class AffiliateRegistrationLinkFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'token' => AffiliateRegistrationLink::generateToken(),
            'is_enabled' => true,
            'auto_approve' => false,
            'default_tier' => 'new',
        ];
    }
}
