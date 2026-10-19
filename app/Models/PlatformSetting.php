<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/**
 * A platform-wide setting the admin panel manages (e.g. outgoing mail). Values are encrypted at
 * rest because some hold provider credentials.
 */
#[Fillable(['key', 'value'])]
#[Hidden(['value'])]
class PlatformSetting extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'encrypted:array',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function valueOf(string $key): array
    {
        return static::query()->where('key', $key)->value('value') ?? [];
    }
}
