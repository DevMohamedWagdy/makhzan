<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Governorate;
use App\Support\Locations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The governorates and cities stores deliver to. Every change answers with the whole refreshed list.
 * Ids are made once from the English name and never change, since they are stored on orders and
 * stores; an entry still in use can be deactivated but not deleted.
 */
class LocationController extends Controller
{
    /** Tables that store a `governorate_id`. */
    private const GOVERNORATE_REFERENCES = ['stores', 'orders', 'customer_addresses', 'warehouses', 'shipping_rates'];

    /** Tables that store a `city_id`. */
    private const CITY_REFERENCES = ['stores', 'orders', 'customer_addresses'];

    public function index(): JsonResponse
    {
        return $this->locations();
    }

    public function storeGovernorate(Request $request): JsonResponse
    {
        $validated = $this->validateEntry($request, 'governorates');

        Governorate::query()->create([
            ...$validated,
            'id' => $this->newId('governorates', $validated['name_en']),
            'sort_order' => (int) Governorate::query()->max('sort_order') + 1,
        ]);

        return $this->locations();
    }

    public function updateGovernorate(Request $request, Governorate $governorate): JsonResponse
    {
        $governorate->update($this->validateEntry($request, 'governorates', $governorate));

        return $this->locations();
    }

    public function destroyGovernorate(Governorate $governorate): JsonResponse
    {
        if ($this->isReferenced(self::GOVERNORATE_REFERENCES, 'governorate_id', $governorate->id)) {
            throw ValidationException::withMessages(['governorate' => __('forms.governorate_in_use')]);
        }

        $governorate->delete();

        return $this->locations();
    }

    public function storeCity(Request $request, Governorate $governorate): JsonResponse
    {
        $validated = $this->validateEntry($request, 'cities', scope: $governorate);

        $governorate->cities()->create([
            ...$validated,
            'id' => $this->newId('cities', $validated['name_en']),
            'sort_order' => (int) $governorate->cities()->max('sort_order') + 1,
        ]);

        return $this->locations();
    }

    public function updateCity(Request $request, City $city): JsonResponse
    {
        $city->update($this->validateEntry($request, 'cities', $city, $city->governorate));

        return $this->locations();
    }

    public function destroyCity(City $city): JsonResponse
    {
        if ($this->isReferenced(self::CITY_REFERENCES, 'city_id', $city->id)) {
            throw ValidationException::withMessages(['city' => __('forms.city_in_use')]);
        }

        $city->delete();

        return $this->locations();
    }

    private function locations(): JsonResponse
    {
        return response()->json(['data' => Locations::all()]);
    }

    /**
     * Names are unique among siblings: governorates platform-wide, cities within their governorate.
     *
     * @return array{name?: string, name_en?: string, is_active?: bool}
     */
    private function validateEntry(Request $request, string $table, Governorate|City|null $entry = null, ?Governorate $scope = null): array
    {
        $unique = fn (string $column) => Rule::unique($table, $column)
            ->ignore($entry?->getKey())
            ->when($scope, fn ($rule) => $rule->where('governorate_id', $scope->id));
        $presence = $entry ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$presence, 'string', 'max:80', $unique('name')],
            'name_en' => [$presence, 'string', 'max:80', 'regex:/[A-Za-z]/', $unique('name_en')],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * A stable id from the English name ("New Cairo" => "new_cairo"), suffixed when already taken.
     */
    private function newId(string $table, string $nameEn): string
    {
        $base = str($nameEn)->slug('_')->limit(34, '')->toString();
        $id = $base;

        for ($suffix = 2; DB::table($table)->where('id', $id)->exists(); $suffix++) {
            $id = "{$base}_{$suffix}";
        }

        return $id;
    }

    /**
     * @param  list<string>  $tables
     */
    private function isReferenced(array $tables, string $column, string $id): bool
    {
        return collect($tables)->contains(fn (string $table): bool => DB::table($table)->where($column, $id)->exists());
    }
}
