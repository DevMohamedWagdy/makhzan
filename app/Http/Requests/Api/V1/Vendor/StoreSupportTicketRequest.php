<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\SupportTicketType;
use App\Http\Requests\Api\V1\ReplyToSupportTicketRequest;
use App\Models\SupportTicket;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A merchant opening a ticket: subject, problem or suggestion, and a first message with
 * optional attachments.
 */
class StoreSupportTicketRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): Response
    {
        return Gate::inspect('create', SupportTicket::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'min:3', 'max:150'],
            'type' => ['required', Rule::enum(SupportTicketType::class)],
            ...ReplyToSupportTicketRequest::messageRules(),
            'body' => ['required', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'subject.required' => __('support.subject_required'),
            'subject.min' => __('support.subject_required'),
            'type.required' => __('support.type_required'),
            'body.required' => __('support.message_required'),
            ...ReplyToSupportTicketRequest::attachmentMessages(),
        ];
    }
}
