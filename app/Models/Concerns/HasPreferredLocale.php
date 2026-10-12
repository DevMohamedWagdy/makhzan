<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\App;

/**
 * Remembers the language a user last used the app in, so notifications sent outside a
 * request (queued emails) reach them in that language. Laravel picks it up through
 * HasLocalePreference::preferredLocale().
 */
trait HasPreferredLocale
{
    public function preferredLocale(): string
    {
        return $this->preferred_locale ?? config('app.locale');
    }

    /**
     * Stores the current request's language when it differs from the saved one.
     */
    public function rememberLocale(): void
    {
        if ($this->preferred_locale !== App::getLocale()) {
            $this->forceFill(['preferred_locale' => App::getLocale()])->saveQuietly();
        }
    }
}
