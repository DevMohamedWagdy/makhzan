<?php

namespace Database\Seeders;

use App\Actions\Affiliates\SyncAffiliateStats;
use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\AffiliateStatus;
use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Real orders for the demo store, placed and moved through their statuses with the same
 * actions the app uses, so affiliate numbers come from orders, not random values.
 * Local use only.
 */
class DemoOrdersSeeder extends Seeder
{
    private const ORDERS = 45;

    /** Statuses demo orders end in, weighted towards delivered. */
    private const OUTCOMES = ['delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'confirmed', 'pending', 'cancelled', 'returned'];

    private const PATHS = [
        'pending' => [],
        'confirmed' => ['confirmed'],
        'shipped' => ['confirmed', 'shipped'],
        'delivered' => ['confirmed', 'shipped', 'delivered'],
        'cancelled' => ['cancelled'],
        'returned' => ['confirmed', 'shipped', 'delivered', 'returned'],
    ];

    public function __construct(
        private PlaceOrder $placeOrder,
        private UpdateOrderStatus $updateStatus,
        private SyncAffiliateStats $syncStats,
    ) {}

    public function run(): void
    {
        // Demo orders shouldn't fill the vendor's bell or the mail queue.
        Notification::fake();

        Store::query()->whereIn('slug', DemoVendorSeeder::STORE_SLUGS)->get()->each(function (Store $store): void {
            if (! $store->orders()->exists() && $store->products()->exists()) {
                $this->seedOrders($store);
            }
        });
    }

    private function seedOrders(Store $store): void
    {

        $store->forceFill(['default_shipping_price' => 60, 'free_shipping_threshold' => 2500])->save();
        $store->shippingRates()->updateOrCreate(['governorate_id' => 'cairo'], ['price' => 45, 'is_enabled' => true]);

        $arabic = fake('ar_EG');
        $customers = Customer::factory()->count(12)->for($store)->state(fn (): array => ['full_name' => $arabic->firstName().' '.$arabic->lastName()])->create();
        $affiliates = $store->affiliates()->where('status', AffiliateStatus::Active)->with('referralCodes')->get();
        $demoAffiliate = $affiliates->firstWhere('phone', DemoVendorSeeder::AFFILIATE_PHONE);
        $governorates = config('makhzan.governorates');

        for ($index = 0; $index < self::ORDERS; $index++) {
            // The demo affiliate gets a steady share so their dashboard has history.
            $affiliate = $index % 3 === 0 ? $demoAffiliate : (fake()->boolean(60) ? $affiliates->random() : null);
            $customer = $customers->random();
            $governorateId = fake()->randomElement(['cairo', 'cairo', 'giza', 'alexandria', 'qalyubia', 'dakahlia']);

            $variants = ProductVariant::query()
                ->where('stock', '>', 1)
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
                ->inRandomOrder()
                ->limit(fake()->numberBetween(1, 3))
                ->get();

            if ($variants->isEmpty()) {
                break;
            }

            try {
                $order = $this->placeOrder->handle(
                    $store,
                    $customer,
                    $variants->map(fn (ProductVariant $variant): array => ['variant_id' => $variant->id, 'quantity' => fake()->numberBetween(1, 2)])->all(),
                    [
                        'recipient_name' => $customer->full_name,
                        'phone' => $customer->phone,
                        'governorate_id' => $governorateId,
                        'city_id' => fake()->randomElement($governorates[$governorateId]),
                        'address_line' => fake()->numberBetween(1, 90).' '.$arabic->streetName(),
                    ],
                    $affiliate?->referralCodes->first()?->code,
                );
            } catch (ValidationException) {
                continue;
            }

            $outcome = $affiliate?->is($demoAffiliate) ? fake()->randomElement(['delivered', 'delivered', 'delivered', 'shipped', 'pending']) : fake()->randomElement(self::OUTCOMES);

            foreach (self::PATHS[$outcome] as $status) {
                $this->updateStatus->handle($order, OrderStatus::from($status), OrderEvent::ACTOR_VENDOR);
            }

            $placedAt = now()->subDays(self::ORDERS - $index)->subHours(fake()->numberBetween(0, 12));
            $order->forceFill(['created_at' => $placedAt])->saveQuietly();
            $order->events()->update(['created_at' => $placedAt]);
        }

        if ($demoAffiliate) {
            $this->payPartOfTheBalance($demoAffiliate->fresh());
        }

        $affiliates->each(fn (Affiliate $affiliate) => $this->syncStats->handle($affiliate));
    }

    /**
     * Two payouts covering part of what the demo affiliate earned, so their transfer history isn't empty.
     */
    private function payPartOfTheBalance(Affiliate $affiliate): void
    {
        $earned = (float) $affiliate->orders()->where('commission_status', CommissionStatus::Earned)->sum('commission_amount');

        foreach ([[0.4, 30, 'TRX20260901'], [0.25, 10, 'TRX20260928']] as [$share, $daysAgo, $reference]) {
            $amount = round($earned * $share);

            if ($amount < 1) {
                continue;
            }

            $affiliate->payouts()->create([
                'store_id' => $affiliate->store_id,
                'amount' => $amount,
                'status' => PayoutStatus::Paid,
                'payout_type' => $affiliate->payout_type,
                'payout_account_name' => $affiliate->payout_account_name,
                'payout_account_last4' => mb_substr((string) $affiliate->payout_account_number, -4),
                'reference' => $reference,
                'paid_at' => now()->subDays($daysAgo),
            ]);
        }
    }
}
