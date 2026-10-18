<?php

namespace App\Http\Requests\Api\V1;

use App\Models\SupportTicket;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

/**
 * A reply in a support ticket's thread, from the merchant or the platform team: text,
 * files, or both. Closed tickets take no replies until an admin reopens them.
 */
class ReplyToSupportTicketRequest extends FormRequest
{
    /**
     * Merchants go through the ticket policy (another store's ticket is a 404); admins
     * were already checked by the admin.can middleware.
     */
    public function authorize(): Response
    {
        return $this->user() instanceof Vendor ? Gate::inspect('reply', $this->ticket()) : Response::allow();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::messageRules();
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->ticket()->isClosed()) {
                    $validator->errors()->add('body', __('support.ticket_closed'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return self::attachmentMessages();
    }

    /**
     * The body and attachment rules shared with opening a ticket.
     *
     * @return array<string, array<mixed>>
     */
    public static function messageRules(): array
    {
        $types = implode(',', config('makhzan.support.attachment_types'));

        return [
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:'.config('makhzan.support.max_attachments')],
            'attachments.*' => ['file', "mimes:{$types}", 'max:'.config('makhzan.support.max_attachment_kb')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function attachmentMessages(): array
    {
        return [
            'body.required_without' => __('support.body_required'),
            'attachments.max' => __('support.attachments_max', ['max' => config('makhzan.support.max_attachments')]),
            'attachments.*.file' => __('forms.file_type'),
            'attachments.*.mimes' => __('support.attachment_type'),
            'attachments.*.max' => __('forms.file_too_large', ['size' => (int) (config('makhzan.support.max_attachment_kb') / 1024)]),
        ];
    }

    public function ticket(): SupportTicket
    {
        return $this->route('ticket');
    }
}
