@php($direction = app()->getLocale() === 'ar' ? 'rtl' : 'ltr')
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $direction }}">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
{{-- The platform's typeface; clients that block web fonts (Gmail, Outlook) fall back to the theme's stack. --}}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@media only screen and (max-width: 600px) {
.inner-body {
width: 100% !important;
}

.footer {
width: 100% !important;
}

.content-cell {
padding: 28px 22px !important;
}
}

@media only screen and (max-width: 500px) {
.button {
width: 100% !important;
}
}
</style>
{!! $head ?? '' !!}
</head>
<body dir="{{ $direction }}">

<table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" dir="{{ $direction }}">
<tr>
<td align="center">
<table class="content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
{!! $header ?? '' !!}

<!-- Email Body -->
<tr>
<td class="body" width="100%" cellpadding="0" cellspacing="0" style="border: hidden !important;">
<table class="inner-body" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
<!-- Brand bar: navy with a gold end, the platform's two colors -->
<tr>
<td class="brand-bar" style="padding: 0; line-height: 0; font-size: 0;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="brand-bar-navy" width="78%" height="4"></td>
<td class="brand-bar-gold" width="22%" height="4"></td>
</tr>
</table>
</td>
</tr>
<!-- Body content -->
<tr>
<td class="content-cell" dir="{{ $direction }}" style="text-align: {{ $direction === 'rtl' ? 'right' : 'left' }};">
{!! Illuminate\Mail\Markdown::parse($slot) !!}

{!! $subcopy ?? '' !!}
</td>
</tr>
</table>
</td>
</tr>

{!! $footer ?? '' !!}
</table>
</td>
</tr>
</table>
</body>
</html>
