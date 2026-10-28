@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<img src="cid:{{ \App\Listeners\EmbedMailLogo::CONTENT_ID }}" class="logo" width="202" height="22" alt="{{ config('app.name') }}">
</a>
</td>
</tr>
