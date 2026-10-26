<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * The contact inbox: messages visitors sent from the landing page, newest first.
 */
class ContactMessageController extends Controller
{
    /**
     * Messages by read state or text (name, phone, email or message), with the unread count.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['unread', 'read'])],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $messages = ContactMessage::query()
            ->when(($filters['status'] ?? null) === 'unread', fn ($query) => $query->whereNull('read_at'))
            ->when(($filters['status'] ?? null) === 'read', fn ($query) => $query->whereNotNull('read_at'))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($query) => $query
                ->where('full_name', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('message', 'like', "%{$term}%")))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return ContactMessageResource::collection($messages)->additional([
            'summary' => [
                'unread' => ContactMessage::query()->whereNull('read_at')->count(),
                'total' => ContactMessage::query()->count(),
            ],
        ]);
    }

    /**
     * Marks a message read or unread.
     */
    public function update(Request $request, ContactMessage $contactMessage): ContactMessageResource
    {
        $isRead = $request->validate(['is_read' => ['required', 'boolean']])['is_read'];

        $contactMessage->forceFill(['read_at' => $isRead ? ($contactMessage->read_at ?? now()) : null])->save();

        return new ContactMessageResource($contactMessage);
    }

    public function destroy(ContactMessage $contactMessage): Response
    {
        $contactMessage->delete();

        return response()->noContent();
    }
}
