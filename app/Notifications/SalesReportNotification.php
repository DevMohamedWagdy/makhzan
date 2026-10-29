<?php

namespace App\Notifications;

use App\Actions\Reports\BuildStoreReport;
use App\Models\Store;
use App\Models\Vendor;
use App\Support\Reports\StoreReportPdf;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The detailed sales report someone sent from the reports page, emailed with the PDF attached: to
 * an account of the store, or to an outside address (an accountant, a partner). The file is built
 * when the email goes out, so it reflects the orders at that moment.
 */
class SalesReportNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Store $store, public string $from, public string $to, public string $senderName) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $from = CarbonImmutable::parse($this->from);
        $to = CarbonImmutable::parse($this->to);
        $pdf = app(StoreReportPdf::class);
        $totals = app(BuildStoreReport::class)->handle($this->store, $from, $to)['totals'];
        $period = ['store' => $this->store->name, 'from' => $this->from, 'to' => $this->to];
        $isAccount = $notifiable instanceof Vendor;

        $mail = (new MailMessage)
            ->subject(__('reports.email.subject', $period))
            ->greeting($isAccount ? __('notifications.greeting', ['name' => $notifiable->full_name]) : __('reports.email.greeting_guest'));

        if (! $isAccount || $notifiable->full_name !== $this->senderName) {
            $mail->line(__('reports.email.sent_by', ['sender' => $this->senderName, 'store' => $this->store->name]));
        }

        $mail->line(__('reports.email.line', $period))
            ->line(__('reports.email.summary', [
                'sales' => number_format($totals['sales'], 2),
                'orders' => $totals['orders'],
                'profit' => number_format($totals['gross_profit'], 2),
            ]));

        // Only the store's own accounts can open the dashboard.
        if ($isAccount) {
            $mail->action(__('reports.email.action'), url("/dashboard/reports?from={$this->from}&to={$this->to}"));
        }

        return $mail->attachData($pdf->build($this->store, $from, $to), $pdf->filename($this->store, $from, $to), ['mime' => 'application/pdf']);
    }
}
