<?php

namespace Database\Factories;

use App\Models\Admin;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupportTicketMessage>
 */
class SupportTicketMessageFactory extends Factory
{
    /**
     * A message from the ticket's merchant by default.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ticket_id' => SupportTicket::factory(),
            'author_type' => SupportTicket::AUTHOR_VENDOR,
            'vendor_id' => fn (array $attributes): ?int => SupportTicket::query()->withoutGlobalScopes()->find($attributes['ticket_id'])?->vendor_id,
            'body' => fake()->paragraph(),
        ];
    }

    public function fromAdmin(?Admin $admin = null): static
    {
        return $this->state(fn (): array => [
            'author_type' => SupportTicket::AUTHOR_ADMIN,
            'vendor_id' => null,
            'admin_id' => $admin?->id ?? Admin::factory(),
        ]);
    }
}
