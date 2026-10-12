<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicStoreResource;
use App\Models\Store;

class StoreController extends Controller
{
    /**
     * Public store identity by slug, for store-branded pages such as affiliate login.
     */
    public function show(Store $store): PublicStoreResource
    {
        return new PublicStoreResource($store);
    }
}
