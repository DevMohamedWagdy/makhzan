<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\ReviewStatus;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateProductReviewRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('review'));
    }

    /**
     * Approve or reject a review and/or reply to it (an empty reply removes it).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'required', Rule::enum(ReviewStatus::class)],
            'reply' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
