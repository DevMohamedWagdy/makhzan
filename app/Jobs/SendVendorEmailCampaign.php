<?php

namespace App\Jobs;

use App\Models\Vendor;
use App\Models\VendorEmailCampaign;
use App\Notifications\AdminMessageNotification;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Emails a campaign to each of its recipients and records how many went out and how many failed; one
 * failed address doesn't stop the rest. The admin panel runs it right after its response
 * (dispatchAfterResponse), so sending needs no queue worker.
 */
class SendVendorEmailCampaign
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public VendorEmailCampaign $campaign) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $sent = 0;
        $failed = 0;

        $this->campaign->recipients()->chunkById(100, function ($vendors) use (&$sent, &$failed): void {
            $vendors->each(function (Vendor $vendor) use (&$sent, &$failed): void {
                try {
                    $vendor->notify(new AdminMessageNotification($this->campaign->subject, $this->campaign->body));
                    $sent++;
                } catch (Throwable $exception) {
                    report($exception);
                    $failed++;
                }
            });

            $this->campaign->update(['sent_count' => $sent, 'failed_count' => $failed]);
        });

        $this->campaign->update([
            'sent_count' => $sent,
            'failed_count' => $failed,
            'status' => match (true) {
                $failed === 0 => VendorEmailCampaign::STATUS_SENT,
                $sent === 0 => VendorEmailCampaign::STATUS_FAILED,
                default => VendorEmailCampaign::STATUS_PARTIAL,
            },
            'finished_at' => now(),
        ]);
    }
}
