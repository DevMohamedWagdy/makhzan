<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\App;

/**
 * Catalog records keep their main text (usually Arabic) in `name`/`description` and an
 * optional English version in `name_en`/`description_en`, shown when the request is in English.
 */
trait HasEnglishTranslation
{
    /**
     * The attribute in the request's language: the English version when the locale is English
     * and one was entered, otherwise the main text.
     */
    public function translated(string $attribute): ?string
    {
        $english = $this->getAttribute("{$attribute}_en");

        return App::getLocale() === 'en' && filled($english) ? $english : $this->getAttribute($attribute);
    }
}
