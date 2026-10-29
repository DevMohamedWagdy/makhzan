<?php

namespace App\Support\Reports;

use App\Actions\Reports\BuildStoreReport;
use App\Models\Order;
use App\Models\Store;
use App\Support\Locations;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;

/**
 * The sales report as a formatted A4 PDF: the period's key figures beside the previous period's,
 * every ranking the reports page shows, then each order in the period. Rendered from the
 * reports.sales-pdf view with mPDF, which shapes Arabic and lays the pages out right to left in
 * Arabic (the app's locale decides the language).
 */
class StoreReportPdf
{
    /** Key figures shown as cards at the top, in order; the rest of the totals follow in the summary table. */
    public const HIGHLIGHTS = ['sales', 'revenue', 'gross_profit', 'orders', 'average_order', 'net_revenue', 'profit_margin', 'new_customers'];

    /** Totals in the summary table, in order. */
    public const METRICS = [
        'orders', 'sales', 'average_order', 'revenue', 'delivered_orders', 'discounts', 'shipping_fees', 'commissions',
        'net_revenue', 'cost_of_goods', 'gross_profit', 'profit_margin', 'cancelled', 'returned', 'refunds', 'new_customers',
    ];

    /** Totals that are amounts of money (the rest are counts or percentages). */
    public const MONEY = ['sales', 'average_order', 'revenue', 'discounts', 'shipping_fees', 'commissions', 'net_revenue', 'cost_of_goods', 'gross_profit', 'refunds'];

    /** Totals where a fall is the good news. */
    public const LOWER_IS_BETTER = ['discounts', 'commissions', 'cost_of_goods', 'cancelled', 'returned', 'refunds'];

    public function __construct(private BuildStoreReport $buildReport) {}

    public function filename(Store $store, CarbonImmutable $from, CarbonImmutable $to): string
    {
        return "sellygrow-report-{$store->slug}-{$from->toDateString()}-{$to->toDateString()}.pdf";
    }

    public function build(Store $store, CarbonImmutable $from, CarbonImmutable $to): string
    {
        $report = $this->buildReport->handle($store, $from, $to);
        $isRtl = app()->getLocale() === 'ar';

        $html = view('reports.sales-pdf', [
            'store' => $store,
            'report' => $report,
            'previousFrom' => $from->subDays($report['period']['days'])->toDateString(),
            'previousTo' => $from->subDay()->toDateString(),
            'orders' => $this->orders($store, $from, $to),
            'governorates' => $this->governorateNames(),
            'logoPath' => $this->logoPath($store),
            'isRtl' => $isRtl,
        ])->render();

        $pdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'default_font' => 'dejavusans',
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'margin_top' => 14,
            'margin_bottom' => 18,
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_footer' => 8,
            'tempDir' => storage_path('framework/cache/mpdf'),
        ]);

        $pdf->SetTitle(__('reports.file_title', ['store' => $store->name]));
        $pdf->SetDirectionality($isRtl ? 'rtl' : 'ltr');
        $pdf->SetHTMLFooter(view('reports.sales-pdf-footer', ['store' => $store])->render());
        $pdf->WriteHTML($html);

        return $pdf->Output('', 'S');
    }

    /**
     * Every order the report counts, oldest first, with its units.
     *
     * @return list<Order>
     */
    private function orders(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->buildReport->orders($store, $from->startOfDay(), $to->endOfDay())
            ->withSum('items', 'quantity')
            ->oldest('orders.created_at')
            ->get()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    private function governorateNames(): array
    {
        return collect(Locations::all())->mapWithKeys(fn (array $governorate): array => [
            $governorate['id'] => (app()->getLocale() === 'en' ? $governorate['name_en'] : null) ?: $governorate['name'],
        ])->all();
    }

    private function logoPath(Store $store): ?string
    {
        return $store->logo_path && Storage::disk('public')->exists($store->logo_path) ? Storage::disk('public')->path($store->logo_path) : null;
    }
}
