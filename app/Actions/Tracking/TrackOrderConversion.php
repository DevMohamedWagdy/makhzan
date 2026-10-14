<?php

namespace App\Actions\Tracking;

use App\Jobs\SendOrderConversion;
use App\Models\Order;
use App\Models\StoreTrackingPixel;

/**
 * Queues an order event (ConversionEvent::PURCHASE or DELIVERED) for the store's ad platforms,
 * when at least one of them takes events from the server.
 */
class TrackOrderConversion
{
    public function handle(Order $order, string $event): void
    {
        $sendsFromServer = $order->store->trackingPixels()->get()
            ->contains(fn (StoreTrackingPixel $pixel): bool => $pixel->setRelation('store', $order->store)->sendsFromServer());

        if ($sendsFromServer) {
            SendOrderConversion::dispatch($order, $event)->afterCommit();
        }
    }
}
