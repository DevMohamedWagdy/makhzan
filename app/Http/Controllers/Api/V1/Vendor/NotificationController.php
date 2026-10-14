<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListNotificationsRequest;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    /**
     * The store's notifications (staff share the owner's), newest first, with the unread count for the bell.
     */
    public function index(ListNotificationsRequest $request): AnonymousResourceCollection
    {
        $vendor = $request->user()->notificationInbox();

        $notifications = $vendor->notifications()
            ->when($request->boolean('unread'), fn ($query) => $query->whereNull('read_at'))
            ->paginate($request->validated('per_page') ?? 20)
            ->withQueryString();

        return NotificationResource::collection($notifications)
            ->additional(['summary' => ['unread_count' => $vendor->unreadNotifications()->count()]]);
    }

    /**
     * Mark one notification as read (when the vendor opens it).
     */
    public function read(Request $request, string $notification): NotificationResource
    {
        $notification = $request->user()->notificationInbox()->notifications()->findOrFail($notification);
        $notification->markAsRead();

        return new NotificationResource($notification);
    }

    /**
     * Mark every unread notification as read.
     */
    public function readAll(Request $request): Response
    {
        $request->user()->notificationInbox()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }
}
