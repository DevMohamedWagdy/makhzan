{{-- The 6-digit email verification code (EmailVerificationCodeNotification), boxed so it reads and copies cleanly. --}}
<x-mail::message>
# {{ $greeting }}

{{ $intro }}

<table class="code-box" width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td>
<p class="code">{{ $code }}</p>
<p class="code-hint">{{ $expiry }}</p>
</td>
</tr>
</table>

{{ $ignore }}

{{ __('Regards,') }}<br>
{{ config('app.name') }}
</x-mail::message>
