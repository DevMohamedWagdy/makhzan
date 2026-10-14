<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListActivityLogsRequest;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * What happened in the owner's store (their team's actions, orders, customers…).
 * Platform admins' actions on the store are left out.
 */
class ActivityLogController extends Controller
{
    public function __invoke(ListActivityLogsRequest $request): AnonymousResourceCollection
    {
        $query = ActivityLog::query()
            ->where('store_id', $request->user()->store->id)
            ->where(fn ($query) => $query->whereNull('actor_type')->orWhere('actor_type', '!=', 'admin'));

        return ActivityLogResource::collection($request->apply($query)->paginate(50)->withQueryString());
    }
}
