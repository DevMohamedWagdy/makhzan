<?php

namespace Database\Factories;

use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Models\Store;
use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupportTicket>
 */
class SupportTicketFactory extends Factory
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
            'vendor_id' => fn (array $attributes): ?int => Store::query()->find($attributes['store_id'])?->vendor_id,
            'subject' => fake()->sentence(4),
            'type' => SupportTicketType::Problem,
            'status' => SupportTicketStatus::Open,
            'last_reply_by' => SupportTicket::AUTHOR_VENDOR,
            'last_activity_at' => now(),
        ];
    }

    public function suggestion(): static
    {
        return $this->state(['type' => SupportTicketType::Suggestion]);
    }

    public function closed(): static
    {
        return $this->state(['status' => SupportTicketStatus::Closed, 'closed_at' => now()]);
    }
}
