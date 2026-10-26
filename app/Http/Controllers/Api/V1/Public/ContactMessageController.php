<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\ContactMessage;
use App\Notifications\AdminAlertNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * The landing page's contact form: saves the message to the admin contact inbox and tells the team.
 */
class ContactMessageController extends Controller
{
    /**
     * Bots that fill the hidden "website" field get the same success answer, but nothing is saved.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'regex:/^\+?[\d\s-]{8,20}$/'],
            'email' => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
            'website' => ['nullable', 'string'],
        ], [
            'full_name.required' => __('forms.full_name_required'),
            'phone.required' => __('forms.phone_required'),
            'phone.regex' => __('forms.phone_invalid'),
            'email.required' => __('forms.email_required'),
            'email.email' => __('forms.email_invalid'),
        ]);

        if (blank($validated['website'] ?? null)) {
            $contactMessage = ContactMessage::query()->create([...$validated, 'ip_address' => $request->ip()]);

            Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::CONTACT_MESSAGE, [
                'contact_message_id' => $contactMessage->id,
                'full_name' => $contactMessage->full_name,
                'excerpt' => Str::limit($contactMessage->message, 80),
            ]));
        }

        return response()->json(['message' => __('forms.contact_message_sent')], 201);
    }
}
