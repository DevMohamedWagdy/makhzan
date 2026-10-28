<?php

namespace App\Support;

use App\Models\City;
use App\Models\Governorate;
use Illuminate\Support\Facades\Cache;

/**
 * The governorates and cities the admin panel manages, read through a cache that the Governorate and
 * City models clear whenever either changes. Validation uses the active ids; the public list carries
 * every entry (inactive ones flagged) so old orders and stores still show their names.
 */
class Locations
{
    private const CACHE_KEY = 'locations';

    /**
     * Active governorate ids => their active city ids, in display order.
     *
     * @return array<string, list<string>>
     */
    public static function active(): array
    {
        return collect(self::all())
            ->where('is_active', true)
            ->mapWithKeys(fn (array $governorate): array => [$governorate['id'] => collect($governorate['cities'])->where('is_active', true)->pluck('id')->all()])
            ->all();
    }

    /**
     * Active governorate ids, in display order.
     *
     * @return list<string>
     */
    public static function activeGovernorateIds(): array
    {
        return array_keys(self::active());
    }

    /**
     * Active city ids of one governorate (none when it's unknown or inactive).
     *
     * @return list<string>
     */
    public static function activeCityIds(?string $governorateId): array
    {
        return self::active()[$governorateId] ?? [];
    }

    /**
     * Every governorate with its cities, as the public endpoint and the frontend read them.
     *
     * @return list<array{id: string, name: string, name_en: string|null, is_active: bool, cities: list<array{id: string, name: string, name_en: string|null, is_active: bool}>}>
     */
    public static function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn (): array => Governorate::query()
            ->with('cities')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Governorate $governorate): array => [
                'id' => $governorate->id,
                'name' => $governorate->name,
                'name_en' => $governorate->name_en,
                'is_active' => $governorate->is_active,
                'cities' => $governorate->cities->map(fn (City $city): array => [
                    'id' => $city->id,
                    'name' => $city->name,
                    'name_en' => $city->name_en,
                    'is_active' => $city->is_active,
                ])->all(),
            ])
            ->all());
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
