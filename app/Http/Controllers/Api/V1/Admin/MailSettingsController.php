<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\ActivityLogger;
use App\Support\MailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * The platform's outgoing mail: which provider sends it, the sender, and the credentials.
 */
class MailSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => MailSettings::forDisplay()]);
    }

    /**
     * Saves the settings. Secrets left blank keep their stored values.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mailer' => ['required', Rule::in(MailSettings::MAILERS)],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:100'],
            'ses_key' => ['nullable', 'required_if:mailer,ses', 'string', 'max:128'],
            'ses_secret' => ['nullable', 'string', 'max:128'],
            'ses_region' => ['nullable', 'required_if:mailer,ses', 'string', 'regex:/^[a-z]{2}(-[a-z]+)+-\d$/'],
            'smtp_host' => ['nullable', 'required_if:mailer,smtp', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'required_if:mailer,smtp', 'integer', 'between:1,65535'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl'])],
        ]);

        if ($validated['mailer'] === 'ses' && blank($validated['ses_secret'] ?? null) && ! MailSettings::forDisplay()['has_ses_secret']) {
            throw ValidationException::withMessages(['ses_secret' => __('settings.mail_secret_required')]);
        }

        MailSettings::update($validated);
        ActivityLogger::log('admin.mail_settings.updated', changes: ['mailer' => $validated['mailer']], actor: $request->user());

        return response()->json(['data' => MailSettings::forDisplay()]);
    }

    /**
     * Sends a test message right away (not queued) so a wrong setting shows up immediately.
     */
    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email', 'max:255']]);

        try {
            Mail::raw(__('settings.mail_test_body', ['app' => config('app.name')]), function (Message $message) use ($validated): void {
                $message->to($validated['email'])->subject(__('settings.mail_test_subject', ['app' => config('app.name')]));
            });
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['email' => __('settings.mail_test_failed', ['error' => $exception->getMessage()])]);
        }

        // The "log" mailer only writes the message to the log file; say so instead of "sent".
        $messageKey = config('mail.default') === 'log' ? 'settings.mail_test_logged' : 'settings.mail_test_sent';

        return response()->json(['message' => __($messageKey, ['email' => $validated['email']])]);
    }
}
