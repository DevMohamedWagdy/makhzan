<?php

namespace Database\Factories;

use App\Enums\PayoutMethod;
use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AffiliatePayout>
 */
class AffiliatePayoutFactory extends Factory
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
            'amount' => fake()->numberBetween(100, 2000),
            'status' => PayoutStatus::Paid,
            'payout_type' => PayoutMethod::VodafoneCash,
            'payout_account_name' => fake()->name(),
            'payout_account_last4' => fake()->numerify('####'),
            'reference' => fake()->optional()->numerify('TRX########'),
            'note' => null,
            'paid_at' => fake()->dateTimeBetween('-60 days'),
        ];
    }

    /**
     * An open transfer request from the affiliate, not paid yet.
     */
    public function requested(): static
    {
        return $this->state(fn (): array => [
            'status' => PayoutStatus::Requested,
            'reference' => null,
            'paid_at' => null,
            'request_note' => 'أرجو تحويل رصيدي',
        ]);
    }

    /**
     * A transfer request the vendor declined.
     */
    public function rejected(): static
    {
        return $this->state(fn (): array => [
            'status' => PayoutStatus::Rejected,
            'reference' => null,
            'paid_at' => null,
            'rejected_at' => now(),
            'note' => 'سيتم التحويل مع دورة الدفع القادمة',
        ]);
    }
}
