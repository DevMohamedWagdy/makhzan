<?php

namespace Database\Factories;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Enums\CommissionType;
use App\Enums\PayoutMethod;
use App\Models\Affiliate;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Affiliate>
 */
class AffiliateFactory extends Factory
{
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $phone = '01'.fake()->randomElement(['0', '1', '2', '5']).fake()->unique()->numerify('########');
        $name = fake()->name();

        return [
            'store_id' => Store::factory(),
            'vendor_id' => fn (array $attributes) => Store::find($attributes['store_id'])->vendor_id,
            'full_name' => $name,
            'phone' => $phone,
            'email' => fake()->optional(0.75)->safeEmail(),
            'password' => static::$password ??= Hash::make('password1'),
            'status' => AffiliateStatus::Active,
            'tier' => AffiliateTier::General,
            'source' => AffiliateSource::Manual,
            'payout_type' => PayoutMethod::VodafoneCash,
            'payout_account_name' => $name,
            'payout_account_number' => $phone,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (): array => [
            'status' => AffiliateStatus::Pending,
            'source' => AffiliateSource::SelfRegistration,
        ]);
    }

    public function frozen(string $reason = 'مخالفة سياسة الإعلانات الممولة'): static
    {
        return $this->state(fn (): array => [
            'status' => AffiliateStatus::Frozen,
            'frozen_reason' => $reason,
            'frozen_at' => now(),
        ]);
    }

    public function tier(AffiliateTier $tier): static
    {
        return $this->state(fn (): array => ['tier' => $tier]);
    }

    public function bankPayout(): static
    {
        return $this->state(fn (): array => [
            'payout_type' => PayoutMethod::BankAccount,
            'payout_account_number' => fake()->numerify('################'),
            'payout_bank_name' => 'البنك الأهلي المصري',
            'payout_iban' => 'EG38'.fake()->numerify('#########################'),
        ]);
    }

    public function withCustomCommission(CommissionType $type = CommissionType::Percentage, float $value = 15, ?string $note = null): static
    {
        return $this->state(fn (): array => [
            'commission_type' => $type,
            'commission_value' => $value,
            'commission_note' => $note,
        ]);
    }

    /**
     * Performance counters as the orders module would maintain them.
     */
    public function withSales(int $minOrders, ?int $maxOrders = null, float $averageOrder = 600): static
    {
        return $this->state(function (array $attributes) use ($minOrders, $maxOrders, $averageOrder): array {
            $orders = fake()->numberBetween($minOrders, $maxOrders ?? $minOrders);
            $sales = $orders * $averageOrder;
            $rate = ($attributes['tier'] instanceof AffiliateTier ? $attributes['tier'] : AffiliateTier::from($attributes['tier']))->defaultCommission();

            return [
                'orders_count' => $orders,
                'sales_total' => $sales,
                'earned_commission' => round($sales * $rate / 100),
                'pending_balance' => fake()->numberBetween(0, 2400),
                'last_active_at' => now()->subDays(fake()->numberBetween(0, 30)),
            ];
        });
    }

    /**
     * Gives active affiliates a referral code, like the create flow does.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Affiliate $affiliate): void {
            if ($affiliate->status !== AffiliateStatus::Pending) {
                $affiliate->createReferralCode()->update(['is_active' => $affiliate->status === AffiliateStatus::Active]);
            }
        });
    }
}
