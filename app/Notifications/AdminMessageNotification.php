<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * An email the platform team writes to one merchant from the admin panel: their subject and text, in the
 * platform's mail design. Sent during the request so the admin learns right away if it failed.
 */
class AdminMessageNotification extends Notification
{
    public function __construct(public string $subject, public string $body) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject)
            ->markdown('mail.admin-message', [
                'greeting' => __('notifications.greeting', ['name' => $notifiable->full_name]),
                // Blank lines split paragraphs; single line breaks stay within a paragraph.
                'paragraphs' => preg_split('/\R{2,}/', trim($this->body)),
                'signature' => __('notifications.admin_message.signature', ['app' => config('app.name')]),
            ]);
    }
}
