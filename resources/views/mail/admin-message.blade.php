{{-- An admin's email to a merchant (AdminMessageNotification). The text is escaped and kept as raw HTML
     paragraphs, so nothing the admin types is read as Markdown or HTML. --}}
<x-mail::message>
# {{ $greeting }}

@foreach ($paragraphs as $paragraph)
<p>{!! nl2br(e($paragraph)) !!}</p>

@endforeach
{{ __('Regards,') }}<br>
{{ $signature }}
</x-mail::message>
