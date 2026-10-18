<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Support\PostTicketMessage;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReplyToSupportTicketRequest;
use App\Http\Requests\Api\V1\Vendor\StoreSupportTicketRequest;
use App\Http\Resources\SupportTicketMessageResource;
use App\Http\Resources\SupportTicketResource;
use App\Models\Admin;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Notifications\AdminAlertNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The store's support tickets with the platform team. Reachable while the store is
 * suspended or unpaid, since that's when merchants most need help.
 */
class SupportTicketController extends Controller
{
    /**
     * The store's tickets, most recent activity first, with counts per status.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', SupportTicket::class);

        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(SupportTicketStatus::class)],
            'type' => ['nullable', Rule::enum(SupportTicketType::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $storeId = $request->user()->store->id;

        $tickets = SupportTicket::query()
            ->where('store_id', $storeId)
            ->withCount('messages')
            ->with('vendor')
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where('subject', 'like', "%{$term}%"))
            ->latest('last_activity_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $counts = SupportTicket::query()->where('store_id', $storeId)->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return SupportTicketResource::collection($tickets)->additional(['summary' => [
            ...collect(SupportTicketStatus::cases())->mapWithKeys(fn (SupportTicketStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)]),
            'total' => (int) $counts->sum(),
        ]]);
    }

    /**
     * Opens a ticket with its first message and lets the platform team know.
     */
    public function store(StoreSupportTicketRequest $request, PostTicketMessage $postMessage): JsonResponse
    {
        $vendor = $request->user();
        $store = $vendor->store;

        $ticket = new SupportTicket([
            'vendor_id' => $vendor->id,
            'subject' => trim($request->validated('subject')),
            'type' => SupportTicketType::from($request->validated('type')),
        ]);
        $ticket->store_id = $store->id;
        $ticket->save();

        $postMessage->handle($ticket, $vendor, $request->validated('body'), $request->file('attachments', []));

        Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::TICKET_OPENED, [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'ticket_id' => $ticket->id,
            'subject' => $ticket->subject,
            'type' => $ticket->type->value,
        ]));

        return (new SupportTicketResource($this->loadThread($ticket)))
            ->additional(['message' => __('support.created')])
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(SupportTicket $ticket): SupportTicketResource
    {
        Gate::authorize('view', $ticket);

        return new SupportTicketResource($this->loadThread($ticket));
    }

    /**
     * The merchant's reply; the platform team is told a ticket is waiting on them.
     */
    public function reply(ReplyToSupportTicketRequest $request, SupportTicket $ticket, PostTicketMessage $postMessage): JsonResponse
    {
        $message = $postMessage->handle($ticket, $request->user(), $request->validated('body'), $request->file('attachments', []));
        $store = $ticket->store;

        Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::TICKET_VENDOR_REPLIED, [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'ticket_id' => $ticket->id,
            'subject' => $ticket->subject,
        ]));

        return (new SupportTicketMessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function attachment(SupportTicket $ticket, int $attachment): StreamedResponse
    {
        Gate::authorize('view', $ticket);

        $file = $ticket->findAttachment($attachment);

        abort_unless(Storage::disk(SupportTicketAttachment::DISK)->exists($file->path), Response::HTTP_NOT_FOUND, __('support.attachment_missing'));

        return Storage::disk(SupportTicketAttachment::DISK)->download($file->path, $file->original_name, ['Content-Type' => $file->mime_type]);
    }

    private function loadThread(SupportTicket $ticket): SupportTicket
    {
        return $ticket->load(['vendor', 'messages.attachments', 'messages.vendor', 'messages.admin']);
    }
}
