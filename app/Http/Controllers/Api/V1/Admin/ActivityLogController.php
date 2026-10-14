<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListActivityLogsRequest;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Everything that happened on the platform, newest first.
 */
class ActivityLogController extends Controller
{
    public function __invoke(ListActivityLogsRequest $request): AnonymousResourceCollection
    {
        return ActivityLogResource::collection($request->apply(ActivityLog::query()->with('store'))->paginate(50)->withQueryString());
    }
}
