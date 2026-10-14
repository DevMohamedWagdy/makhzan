<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\StoreTrackingPixel;
use App\Support\Tracking\ConversionApis;
use App\Support\Tracking\ConversionEvent;
use App\Support\Tracking\ConversionFailed;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Sends one order event to every ad platform the store sends from the server, recording on
 * each pixel whether it got through. A platform that refuses doesn't stop the others.
 */
class SendOrderConversion implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public Order $order, public string $event) {}

    /**
     * Execute the job.
     */
    public function handle(ConversionApis $apis): void
    {
        $pixels = $this->order->store->trackingPixels()->get()
            ->filter(fn (StoreTrackingPixel $pixel): bool => $pixel->setRelation('store', $this->order->store)->sendsFromServer() && $apis->supports($pixel->provider, $this->event));

        if ($pixels->isEmpty()) {
            return;
        }

        $conversion = ConversionEvent::fromOrder($this->order, $this->event);

        foreach ($pixels as $pixel) {
            try {
                $apis->send($pixel, $conversion);
                $pixel->recordDelivery();
            } catch (ConversionFailed $exception) {
                $pixel->recordDelivery($exception->getMessage());
            }
        }
    }
}
