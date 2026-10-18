<?php

namespace App\Actions\Support;

use App\Models\Admin;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use App\Models\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Adds a message to a ticket's thread from the merchant (a vendor account) or the platform
 * team (an admin), storing its attachments privately and marking whose turn it is.
 */
class PostTicketMessage
{
    /**
     * @param  list<UploadedFile>  $files
     */
    public function handle(SupportTicket $ticket, Vendor|Admin $author, ?string $body, array $files = []): SupportTicketMessage
    {
        $authorType = $author instanceof Admin ? SupportTicket::AUTHOR_ADMIN : SupportTicket::AUTHOR_VENDOR;
        $storedPaths = [];

        try {
            return DB::transaction(function () use ($ticket, $author, $authorType, $body, $files, &$storedPaths): SupportTicketMessage {
                $message = $ticket->messages()->create([
                    'author_type' => $authorType,
                    'vendor_id' => $author instanceof Vendor ? $author->id : null,
                    'admin_id' => $author instanceof Admin ? $author->id : null,
                    'body' => filled($body) ? trim($body) : null,
                ]);

                foreach ($files as $file) {
                    $path = $file->store("support-tickets/{$ticket->store_id}/{$ticket->id}", SupportTicketAttachment::DISK);
                    $storedPaths[] = $path;

                    $message->attachments()->create([
                        'path' => $path,
                        'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                        'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                        'size' => $file->getSize(),
                    ]);
                }

                $ticket->forceFill(['last_reply_by' => $authorType, 'last_activity_at' => now()])->save();

                return $message->load(['attachments', 'vendor', 'admin']);
            });
        } catch (Throwable $exception) {
            // The rows rolled back; don't leave their files behind.
            Storage::disk(SupportTicketAttachment::DISK)->delete($storedPaths);

            throw $exception;
        }
    }
}
