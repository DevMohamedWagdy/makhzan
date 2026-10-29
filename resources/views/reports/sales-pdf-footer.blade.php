<table width="100%" style="border-top: 1px solid #e5e7eb; font-size: 7.5pt; color: #6b7280;">
    <tr>
        <td>{{ __('reports.footer', ['store' => $store->name, 'date' => now()->locale(app()->getLocale())->translatedFormat('j F Y، g:i a')]) }}</td>
        <td style="text-align: {{ app()->getLocale() === 'ar' ? 'left' : 'right' }};">{{ __('reports.page') }}</td>
    </tr>
</table>
