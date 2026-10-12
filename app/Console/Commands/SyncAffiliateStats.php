<?php

namespace App\Console\Commands;

use App\Actions\Affiliates\SyncAffiliateStats as SyncAffiliateStatsAction;
use App\Models\Affiliate;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('makhzan:sync-affiliate-stats {--store= : Only this store (slug)} {--dry-run : Show the differences without saving}')]
#[Description('Recompute affiliate orders, sales, commissions and pending balances from delivered orders and payouts')]
class SyncAffiliateStats extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SyncAffiliateStatsAction $sync): int
    {
        $affiliates = Affiliate::query()
            ->when($this->option('store'), fn ($query, string $slug) => $query->whereHas('store', fn ($query) => $query->where('slug', $slug)))
            ->with('referralCodes')
            ->orderBy('id');

        $changes = [];

        $affiliates->each(function (Affiliate $affiliate) use ($sync, &$changes): void {
            ['before' => $before, 'after' => $after] = $sync->handle($affiliate, (bool) $this->option('dry-run'));

            if ($before != $after) {
                $changes[] = [
                    $affiliate->id,
                    $affiliate->full_name,
                    "{$before['orders_count']} -> {$after['orders_count']}",
                    "{$before['earned_commission']} -> {$after['earned_commission']}",
                    "{$before['pending_balance']} -> {$after['pending_balance']}",
                ];
            }
        });

        if ($changes) {
            $this->table(['ID', 'Affiliate', 'Orders', 'Earned', 'Pending balance'], $changes);
        }

        $this->info(($this->option('dry-run') ? 'Would update ' : 'Updated ').count($changes).' affiliate(s).');

        return self::SUCCESS;
    }
}
