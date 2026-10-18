<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListNotificationsRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * The store's notifications (staff share the owner's, limited to the sections their role
     * allows), newest first, with the unread count for the bell.
     */
    public function index(ListNotificationsRequest $request): AnonymousResourceCollection
    {
        $notifications = $this->inbox($request)
            ->when($request->boolean('unread'), fn ($query) => $query->whereNull('read_at'))
            ->paginate($request->validated('per_page') ?? 20)
            ->withQueryString();

        return NotificationResource::collection($notifications)
            ->additional(['summary' => ['unread_count' => $this->inbox($request)->whereNull('read_at')->count()]]);
    }

    /**
     * Mark one notification as read (when the vendor opens it).
     */
    public function read(Request $request, string $notification): NotificationResource
    {
        $notification = $this->inbox($request)->findOrFail($notification);
        $notification->markAsRead();

        return new NotificationResource($notification);
    }

    /**
     * Mark every unread notification the account can see as read.
     */
    public function readAll(Request $request): Response
    {
        $this->inbox($request)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent();
    }

    /**
     * The notifications this account may see.
     *
     * @return MorphMany<DatabaseNotification, Vendor>
     */
    private function inbox(Request $request): MorphMany
    {
        /** @var Vendor $vendor */
        $vendor = $request->user();
        $types = $vendor->visibleNotificationTypes();

        return $vendor->notificationInbox()->notifications()->when($types !== null, fn ($query) => $query->whereIn('type', $types));
    }
}
