<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\ActivityLogger;
use App\Support\SiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The public website's content: the footer's WhatsApp and email, and the Terms and Privacy pages.
 */
class SiteSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => SiteSettings::forDisplay()]);
    }

    /**
     * Saves the settings. A blank field clears it (a blank legal page falls back to the built-in text).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'whatsapp' => ['nullable', 'string', 'regex:/^\+?[\d\s-]{8,20}$/'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'terms_ar' => ['nullable', 'string', 'max:50000'],
            'terms_en' => ['nullable', 'string', 'max:50000'],
            'privacy_ar' => ['nullable', 'string', 'max:50000'],
            'privacy_en' => ['nullable', 'string', 'max:50000'],
        ]);

        SiteSettings::update($validated);
        ActivityLogger::log('admin.site_settings.updated', changes: array_keys(array_filter($validated, filled(...))), actor: $request->user());

        return response()->json(['data' => SiteSettings::forDisplay()]);
    }
}
