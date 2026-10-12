<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the response language from the Accept-Language header the SPA sends. Requests
 * without it, or asking for an unsupported language, get the default (Arabic).
 */
class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('makhzan.locales');
        $requested = $request->hasHeader('Accept-Language') ? $request->getPreferredLanguage($supported) : null;

        App::setLocale(in_array($requested, $supported, true) ? $requested : config('app.locale'));

        $response = $next($request);
        $response->headers->set('Content-Language', App::getLocale());

        return $response;
    }
}
