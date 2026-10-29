<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListActivityLogsRequest;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * What the store's team (the owner and staff) did in the store, with the team members who appear in
 * it for the "who" filter. Platform admins' actions on the store are left out.
 */
class ActivityLogController extends Controller
{
    public function __invoke(ListActivityLogsRequest $request): AnonymousResourceCollection
    {
        $query = ActivityLog::query()
            ->where('store_id', $request->user()->store->id)
            ->where('actor_type', 'vendor');

        $members = (clone $query)->toBase()
            ->select('actor_id', DB::raw('max(actor_name) as name'))
            ->groupBy('actor_id')
            ->orderBy('name')
            ->get()
            ->map(fn (object $member): array => ['vendor_id' => (int) $member->actor_id, 'name' => $member->name]);

        return ActivityLogResource::collection($request->apply($query)->paginate(30)->withQueryString())
            ->additional(['members' => $members, 'retention_days' => (int) config('makhzan.activity_log.retention_days')]);
    }
}
