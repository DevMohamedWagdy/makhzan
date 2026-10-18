<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Support\PostTicketMessage;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReplyToSupportTicketRequest;
use App\Http\Resources\SupportTicketMessageResource;
use App\Http\Resources\SupportTicketResource;
use App\Models\Store;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Notifications\SupportTicketUpdateNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Every store's support tickets: read the thread, reply, close and reopen. The store's
 * owner is told about each reply and status change.
 */
class SupportTicketController extends Controller
{
    /**
     * Tickets by status, type, store or text (subject, store name or ticket number), most
     * recent activity first, with counts per status and the stores that have tickets.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(SupportTicketStatus::class)],
            'type' => ['nullable', Rule::enum(SupportTicketType::class)],
            'store_id' => ['nullable', 'integer'],
            'awaiting_reply' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $tickets = SupportTicket::query()
            ->with(['store', 'vendor'])
            ->withCount('messages')
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->when($filters['store_id'] ?? null, fn ($query, int|string $storeId) => $query->where('store_id', $storeId))
            ->when($request->boolean('awaiting_reply'), fn ($query) => $query->where('status', SupportTicketStatus::Open)->where('last_reply_by', SupportTicket::AUTHOR_VENDOR))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($query) => $query
                ->where('subject', 'like', "%{$term}%")
                ->orWhereHas('store', fn ($query) => $query->where('name', 'like', "%{$term}%"))
                ->when(ctype_digit(ltrim($term, '#')), fn ($query) => $query->orWhere('id', (int) ltrim($term, '#')))))
            ->latest('last_activity_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $counts = SupportTicket::query()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return SupportTicketResource::collection($tickets)->additional([
            'summary' => [
                ...collect(SupportTicketStatus::cases())->mapWithKeys(fn (SupportTicketStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)]),
                'awaiting_reply' => SupportTicket::query()->where('status', SupportTicketStatus::Open)->where('last_reply_by', SupportTicket::AUTHOR_VENDOR)->count(),
                'total' => (int) $counts->sum(),
            ],
            'stores' => Store::query()
                ->whereIn('id', SupportTicket::query()->select('store_id'))
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Store $store): array => ['store_id' => $store->id, 'name' => $store->name]),
        ]);
    }

    public function show(SupportTicket $ticket): SupportTicketResource
    {
        return new SupportTicketResource($this->loadThread($ticket));
    }

    public function reply(ReplyToSupportTicketRequest $request, SupportTicket $ticket, PostTicketMessage $postMessage): JsonResponse
    {
        $message = $postMessage->handle($ticket, $request->user(), $request->validated('body'), $request->file('attachments', []));

        $ticket->store->vendor->notify(new SupportTicketUpdateNotification(SupportTicketUpdateNotification::REPLIED, $ticket));

        return (new SupportTicketMessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function close(SupportTicket $ticket): SupportTicketResource
    {
        if ($ticket->isClosed()) {
            throw ValidationException::withMessages(['status' => __('support.already_closed')]);
        }

        $ticket->forceFill(['status' => SupportTicketStatus::Closed, 'closed_at' => now()])->save();
        $ticket->store->vendor->notify(new SupportTicketUpdateNotification(SupportTicketUpdateNotification::CLOSED, $ticket));

        return (new SupportTicketResource($this->loadThread($ticket)))->additional(['message' => __('support.closed')]);
    }

    public function reopen(SupportTicket $ticket): SupportTicketResource
    {
        if (! $ticket->isClosed()) {
            throw ValidationException::withMessages(['status' => __('support.already_open')]);
        }

        $ticket->forceFill(['status' => SupportTicketStatus::Open, 'closed_at' => null, 'last_activity_at' => now()])->save();
        $ticket->store->vendor->notify(new SupportTicketUpdateNotification(SupportTicketUpdateNotification::REOPENED, $ticket));

        return (new SupportTicketResource($this->loadThread($ticket)))->additional(['message' => __('support.reopened')]);
    }

    public function attachment(SupportTicket $ticket, int $attachment): StreamedResponse
    {
        $file = $ticket->findAttachment($attachment);

        abort_unless(Storage::disk(SupportTicketAttachment::DISK)->exists($file->path), Response::HTTP_NOT_FOUND, __('support.attachment_missing'));

        return Storage::disk(SupportTicketAttachment::DISK)->download($file->path, $file->original_name, ['Content-Type' => $file->mime_type]);
    }

    private function loadThread(SupportTicket $ticket): SupportTicket
    {
        return $ticket->load(['store', 'vendor', 'messages.attachments', 'messages.vendor', 'messages.admin']);
    }
}
