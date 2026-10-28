<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Support\Purchasing\ReorderSuggestions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Smart reorder: which variants to buy, how many, and from whom, based on how fast they sell.
 */
class ReorderSuggestionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', Rule::in([14, 30, 60, 90])],
            'cover_days' => ['nullable', 'integer', Rule::in([7, 14, 30, 60])],
        ]);

        return response()->json([
            'data' => ReorderSuggestions::for($request->user()->store, (int) ($validated['days'] ?? 30), (int) ($validated['cover_days'] ?? 30)),
        ]);
    }
}
