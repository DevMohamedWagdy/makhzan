<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Support\SiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;

/**
 * Admin-managed content of the public website: the footer's contact channels and the legal pages.
 */
class SiteContentController extends Controller
{
    public function contact(): JsonResponse
    {
        return response()->json(['data' => SiteSettings::contact()]);
    }

    /**
     * A legal page's saved text in the request's language, or null content for the built-in one.
     */
    public function legal(string $document): JsonResponse
    {
        return response()->json(['data' => SiteSettings::legal($document, App::getLocale())]);
    }
}
