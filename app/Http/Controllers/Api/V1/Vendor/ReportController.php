<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Reports\BuildStoreReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\EmailReportRequest;
use App\Http\Requests\Api\V1\Vendor\ReportRequest;
use App\Models\Vendor;
use App\Notifications\SalesReportNotification;
use App\Support\Reports\StoreReportPdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;

class ReportController extends Controller
{
    /**
     * Sales report for a period (default: the last 30 days) compared with the period before it.
     */
    public function __invoke(ReportRequest $request, BuildStoreReport $buildReport): JsonResponse
    {
        return response()->json($buildReport->handle($request->user()->store, $request->periodStart(), $request->periodEnd()));
    }

    /**
     * The same period's report as a formatted PDF (key figures, every section, then each order).
     */
    public function export(ReportRequest $request, StoreReportPdf $pdf): Response
    {
        $store = $request->user()->store;

        return response($pdf->build($store, $request->periodStart(), $request->periodEnd()), Response::HTTP_OK, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf->filename($store, $request->periodStart(), $request->periodEnd()).'"',
        ]);
    }

    /**
     * Who the report can be emailed to by account: the store's owner and active team members.
     */
    public function recipients(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->store->activeAccounts()->map(fn (Vendor $vendor): array => [
            'vendor_id' => $vendor->id,
            'full_name' => $vendor->full_name,
            'email' => $vendor->email,
            'is_owner' => $vendor->isOwner(),
            'is_me' => $vendor->is($request->user()),
        ])->all()]);
    }

    /**
     * Emails the period's PDF, in the background, to the chosen accounts and other addresses.
     */
    public function email(EmailReportRequest $request): JsonResponse
    {
        $sender = $request->user();
        $notification = fn (): SalesReportNotification => (new SalesReportNotification($sender->store, $request->periodStart()->toDateString(), $request->periodEnd()->toDateString(), $sender->full_name))->locale(app()->getLocale());
        $accounts = $request->recipientAccounts();
        $emails = $request->recipientEmails();

        Notification::send($accounts, $notification());

        foreach ($emails as $email) {
            Notification::route('mail', $email)->notify($notification());
        }

        return response()->json(['message' => __('reports.email.queued', ['count' => $accounts->count() + count($emails)])], Response::HTTP_ACCEPTED);
    }
}
