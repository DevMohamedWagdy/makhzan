<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * The admin's bell: new stores and support tickets.
 */
class NotificationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $admin = $request->user();
        $perPage = (int) ($request->validate(['per_page' => ['nullable', 'integer', 'min:1', 'max:50']])['per_page'] ?? 20);

        return NotificationResource::collection($admin->notifications()->when($request->boolean('unread'), fn ($query) => $query->whereNull('read_at'))->paginate($perPage))
            ->additional(['summary' => ['unread_count' => $admin->unreadNotifications()->count()]]);
    }

    public function read(Request $request, string $notification): NotificationResource
    {
        $notification = $request->user()->notifications()->findOrFail($notification);
        $notification->markAsRead();

        return new NotificationResource($notification);
    }

    public function readAll(Request $request): Response
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }
}
