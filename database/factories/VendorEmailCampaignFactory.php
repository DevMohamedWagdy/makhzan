<?php

namespace Database\Factories;

use App\Models\VendorEmailCampaign;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorEmailCampaign>
 */
class VendorEmailCampaignFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'subject' => fake()->sentence(4),
            'body' => fake()->paragraph(),
            'audience' => VendorEmailCampaign::AUDIENCE_ALL,
            'recipients_count' => 3,
            'sent_count' => 3,
            'failed_count' => 0,
            'status' => VendorEmailCampaign::STATUS_SENT,
            'finished_at' => now(),
        ];
    }
}
