@php
    $money = fn ($value) => $value === null ? '—' : number_format((float) $value, 2).' '.__('reports.currency');
    $number = fn ($value) => $value === null ? '—' : number_format((float) $value, floor((float) $value) == (float) $value ? 0 : 1);
    $percent = fn ($value) => $value === null ? '—' : number_format((float) $value, 1).'%';
    $metric = fn (string $key, $value) => match (true) {
        in_array($key, \App\Support\Reports\StoreReportPdf::MONEY, true) => $money($value),
        $key === 'profit_margin' => $percent($value),
        default => $number($value),
    };
    $change = function (string $key) use ($report) {
        $current = $report['totals'][$key];
        $previous = $report['previous'][$key];

        if (! $previous) {
            return null;
        }

        $delta = round(($current - $previous) / abs($previous) * 100, 1);
        $isGood = in_array($key, \App\Support\Reports\StoreReportPdf::LOWER_IS_BETTER, true) ? $delta <= 0 : $delta >= 0;

        return ['text' => ($delta >= 0 ? '▲ ' : '▼ ').number_format(abs($delta), 1).'%', 'class' => $delta == 0 ? 'flat' : ($isGood ? 'up' : 'down')];
    };
    $date = fn (string $value) => \Carbon\Carbon::parse($value)->locale(app()->getLocale())->translatedFormat('j F Y');
    $start = $isRtl ? 'right' : 'left';
    $end = $isRtl ? 'left' : 'right';
@endphp
<html dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
<head>
<style>
    body { font-family: dejavusans; font-size: 9pt; color: #1f2937; }
    .hero { background-color: #0f1d42; color: #ffffff; }
    .hero td { padding: 18px 20px; vertical-align: middle; }
    .hero-store { font-size: 15pt; font-weight: bold; color: #ffffff; }
    .hero-muted { color: #b6c0dc; font-size: 8.5pt; }
    .hero-title { font-size: 20pt; font-weight: bold; color: #ffffff; }
    .hero-period { color: #f5a524; font-size: 10pt; font-weight: bold; }
    .gold { background-color: #f5a524; height: 4px; font-size: 1pt; }
    table.cards { border-collapse: separate; border-spacing: 6px; margin: 4px -6px 0 -6px; }
    table.cards td.card { width: 25%; vertical-align: top; background-color: #f8fafc; border: 1px solid #e5e7eb; border-top: 3px solid #0f1d42; padding: 10px 12px; }
    .card-label { color: #6b7280; font-size: 8pt; }
    .card-value { font-size: 14pt; font-weight: bold; color: #0f1d42; padding-top: 3px; }
    .card-change { font-size: 7.5pt; padding-top: 3px; }
    .up { color: #047857; }
    .down { color: #b91c1c; }
    .flat { color: #6b7280; }
    h2 { font-size: 11.5pt; color: #0f1d42; margin: 18px 0 6px 0; padding: 2px 8px; border-{{ $start }}: 4px solid #f5a524; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th { background-color: #0f1d42; color: #ffffff; font-size: 8pt; font-weight: bold; padding: 6px 7px; text-align: {{ $start }}; }
    table.data td { padding: 5px 7px; border-bottom: 1px solid #e5e7eb; text-align: {{ $start }}; }
    table.data tr.alt td { background-color: #f8fafc; }
    table.data td.num, table.data th.num { text-align: {{ $end }}; }
    table.data tr.total td { font-weight: bold; background-color: #eef2ff; }
    .sub { color: #6b7280; font-size: 7.5pt; }
    .empty { color: #6b7280; padding: 8px; border: 1px dashed #d1d5db; text-align: center; }
    table.orders td, table.orders th { font-size: 7.5pt; padding: 4px 5px; }
</style>
</head>
<body>

<table class="hero" width="100%" cellspacing="0">
    <tr>
        @if ($logoPath)
            <td width="60" style="padding-{{ $end }}: 0;"><img src="{{ $logoPath }}" width="48" height="48" /></td>
        @endif
        <td>
            <div class="hero-store">{{ $store->name }}</div>
            @if ($store->contact_phone)
                <div class="hero-muted">{{ $store->contact_phone }}</div>
            @endif
        </td>
        <td style="text-align: {{ $end }};">
            <div class="hero-title">{{ __('reports.title') }}</div>
            <div class="hero-period">{{ __('reports.period_value', ['from' => $date($report['period']['from']), 'to' => $date($report['period']['to'])]) }}</div>
            <div class="hero-muted">{{ __('reports.previous_period', ['from' => $date($previousFrom), 'to' => $date($previousTo)]) }}</div>
        </td>
    </tr>
</table>
<div class="gold">&nbsp;</div>

<table class="cards" width="100%">
    @foreach (array_chunk(\App\Support\Reports\StoreReportPdf::HIGHLIGHTS, 4) as $row)
        <tr>
            @foreach ($row as $key)
                @php $delta = $change($key); @endphp
                <td class="card">
                    <div class="card-label">{{ __("reports.metrics.{$key}") }}</div>
                    <div class="card-value">{{ $metric($key, $report['totals'][$key]) }}</div>
                    <div class="card-change {{ $delta['class'] ?? 'flat' }}">{{ $delta ? __('reports.vs_previous', ['change' => $delta['text']]) : __('reports.no_previous') }}</div>
                </td>
            @endforeach
        </tr>
    @endforeach
</table>

<h2>{{ __('reports.sections.summary') }}</h2>
<table class="data">
    <thead><tr>
        <th>{{ __('reports.columns.metric') }}</th>
        <th class="num">{{ __('reports.columns.current') }}</th>
        <th class="num">{{ __('reports.columns.previous') }}</th>
        <th class="num">{{ __('reports.columns.change') }}</th>
    </tr></thead>
    <tbody>
        @foreach (\App\Support\Reports\StoreReportPdf::METRICS as $index => $key)
            @php $delta = $change($key); @endphp
            <tr class="{{ $index % 2 ? 'alt' : '' }}">
                <td>{{ __("reports.metrics.{$key}") }}</td>
                <td class="num"><b>{{ $metric($key, $report['totals'][$key]) }}</b></td>
                <td class="num">{{ $metric($key, $report['previous'][$key]) }}</td>
                <td class="num {{ $delta['class'] ?? 'flat' }}">{{ $delta['text'] ?? '—' }}</td>
            </tr>
        @endforeach
    </tbody>
</table>
@if ($report['totals']['uncosted_items'] > 0)
    <p class="sub">{{ __('reports.uncosted_note', ['count' => $report['totals']['uncosted_items']]) }}</p>
@endif

@php
    $sections = [
        'statuses' => [
            'columns' => ['status' => false, 'count' => true],
            'rows' => collect($report['statuses'])->map(fn ($count, $status) => [__("reports.statuses.{$status}"), $number($count)])->values()->all(),
        ],
        'top_products' => [
            'columns' => ['product' => false, 'quantity' => true, 'sales' => true],
            'rows' => array_map(fn ($row) => [$row['name'], $number($row['quantity']), $money($row['sales'])], $report['top_products']),
        ],
        'profitable_products' => [
            'columns' => ['product' => false, 'quantity' => true, 'sales' => true, 'cost' => true, 'profit' => true, 'margin' => true],
            'rows' => array_map(fn ($row) => [$row['name'], $number($row['quantity']), $money($row['sales']), $money($row['cost']), $money($row['profit']), $percent($row['margin'])], $report['profitable_products']),
        ],
        'payment_methods' => [
            'columns' => ['payment_method' => false, 'orders' => true, 'sales' => true],
            'rows' => array_map(fn ($row) => [__("reports.payment_methods.{$row['method']}"), $number($row['orders']), $money($row['sales'])], $report['payment_methods']),
        ],
        'governorates' => [
            'columns' => ['governorate' => false, 'orders' => true, 'sales' => true],
            'rows' => array_map(fn ($row) => [$governorates[$row['governorate_id']] ?? $row['governorate_id'], $number($row['orders']), $money($row['sales'])], $report['governorates']),
        ],
        'governorate_returns' => [
            'columns' => ['governorate' => false, 'orders' => true, 'delivered' => true, 'returned' => true, 'cancelled' => true, 'return_rate' => true],
            'rows' => array_map(fn ($row) => [$governorates[$row['governorate_id']] ?? $row['governorate_id'], $number($row['orders']), $number($row['delivered']), $number($row['returned']), $number($row['cancelled']), $percent($row['return_rate'])], $report['governorate_returns']),
        ],
        'affiliates' => [
            'columns' => ['affiliate' => false, 'orders' => true, 'sales' => true, 'commission' => true],
            'rows' => array_map(fn ($row) => [$row['full_name'], $number($row['orders']), $money($row['sales']), $money($row['commission'])], $report['affiliates']),
        ],
        'stock_forecast' => [
            'columns' => ['product' => false, 'stock' => true, 'sold' => true, 'daily_rate' => true, 'days_left' => true],
            'rows' => array_map(fn ($row) => [$row['name'].($row['variant_title'] ? ' — '.$row['variant_title'] : ''), $number($row['stock']), $number($row['sold']), $number($row['daily_rate']), $number($row['days_left'])], $report['stock_forecast']),
        ],
    ];
    $activeDays = array_values(array_filter($report['daily'], fn ($day) => $day['orders'] > 0 || $day['revenue'] > 0));
@endphp

<h2>{{ __('reports.sections.daily') }}</h2>
@if ($activeDays === [])
    <div class="empty">{{ __('reports.no_data') }}</div>
@else
    <table class="data">
        <thead><tr>
            <th>{{ __('reports.columns.date') }}</th>
            <th class="num">{{ __('reports.columns.orders') }}</th>
            <th class="num">{{ __('reports.columns.sales') }}</th>
            <th class="num">{{ __('reports.columns.revenue') }}</th>
        </tr></thead>
        <tbody>
            @foreach ($activeDays as $index => $day)
                <tr class="{{ $index % 2 ? 'alt' : '' }}">
                    <td>{{ $day['date'] }}</td>
                    <td class="num">{{ $number($day['orders']) }}</td>
                    <td class="num">{{ $money($day['sales']) }}</td>
                    <td class="num">{{ $money($day['revenue']) }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td>{{ __('reports.columns.total') }}</td>
                <td class="num">{{ $number($report['totals']['orders']) }}</td>
                <td class="num">{{ $money($report['totals']['sales']) }}</td>
                <td class="num">{{ $money($report['totals']['revenue']) }}</td>
            </tr>
        </tbody>
    </table>
    <p class="sub">{{ __('reports.daily_note') }}</p>
@endif

@foreach ($sections as $key => $section)
    <h2>{{ __("reports.sections.{$key}") }}</h2>
    @if ($section['rows'] === [])
        <div class="empty">{{ __('reports.no_data') }}</div>
    @else
        <table class="data">
            <thead><tr>
                @foreach ($section['columns'] as $column => $isNumber)
                    <th class="{{ $isNumber ? 'num' : '' }}">{{ __("reports.columns.{$column}") }}</th>
                @endforeach
            </tr></thead>
            <tbody>
                @foreach ($section['rows'] as $index => $cells)
                    <tr class="{{ $index % 2 ? 'alt' : '' }}">
                        @foreach (array_values($section['columns']) as $position => $isNumber)
                            <td class="{{ $isNumber ? 'num' : '' }}">{{ $cells[$position] }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
@endforeach

<pagebreak />
<h2>{{ __('reports.sections.orders') }} ({{ $number(count($orders)) }})</h2>
@if ($orders === [])
    <div class="empty">{{ __('reports.no_data') }}</div>
@else
    <table class="data orders" repeat_header="1">
        <thead><tr>
            <th>{{ __('reports.columns.number') }}</th>
            <th>{{ __('reports.columns.date') }}</th>
            <th>{{ __('reports.columns.customer') }}</th>
            <th>{{ __('reports.columns.phone') }}</th>
            <th>{{ __('reports.columns.governorate') }}</th>
            <th>{{ __('reports.columns.status') }}</th>
            <th>{{ __('reports.columns.payment_method') }}</th>
            <th class="num">{{ __('reports.columns.items') }}</th>
            <th class="num">{{ __('reports.columns.discounts') }}</th>
            <th class="num">{{ __('reports.columns.total') }}</th>
        </tr></thead>
        <tbody>
            @foreach ($orders as $index => $order)
                <tr class="{{ $index % 2 ? 'alt' : '' }}">
                    <td><b>#{{ $order->number }}</b></td>
                    <td>{{ $order->created_at->format('Y-m-d H:i') }}</td>
                    <td>{{ $order->recipient_name }}</td>
                    <td>{{ $order->phone }}</td>
                    <td>{{ $governorates[$order->governorate_id] ?? $order->governorate_id }}</td>
                    <td>{{ __("reports.statuses.{$order->status->value}") }}</td>
                    <td><div>{{ $order->payment_method ? __("reports.payment_methods.{$order->payment_method->value}") : '—' }}</div><div class="sub">{{ __('reports.payment_statuses.'.($order->payment_status?->value ?? 'unpaid')) }}</div></td>
                    <td class="num">{{ $number($order->items_sum_quantity ?? 0) }}</td>
                    <td class="num">{{ $money($order->discount + $order->shipping_discount + $order->points_discount) }}</td>
                    <td class="num"><b>{{ $money($order->total) }}</b></td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif

</body>
</html>
