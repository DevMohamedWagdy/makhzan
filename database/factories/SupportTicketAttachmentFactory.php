<?php

namespace Database\Factories;

use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupportTicketAttachment>
 */
class SupportTicketAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'message_id' => SupportTicketMessage::factory(),
            'path' => 'support-tickets/'.fake()->uuid().'.pdf',
            'original_name' => 'invoice.pdf',
            'mime_type' => 'application/pdf',
            'size' => 2048,
        ];
    }
}
