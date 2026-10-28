<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Support\Locations;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    /**
     * Every governorate with its cities (inactive ones flagged), which the app loads before it renders.
     */
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => Locations::all()]);
    }
}
