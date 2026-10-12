<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreSlugAvailabilityController extends Controller
{
    /**
     * Live availability check for the sign-up wizard's store URL field.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['slug' => ['required', 'string', 'max:40']]);
        $slug = Str::lower($validated['slug']);

        $available = ! in_array($slug, config('makhzan.reserved_slugs'), true)
            && ! Store::query()->where('slug', $slug)->exists();

        return response()->json(['slug' => $slug, 'available' => $available]);
    }
}
