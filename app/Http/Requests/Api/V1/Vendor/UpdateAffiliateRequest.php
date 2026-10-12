<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Models\Affiliate;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Gate;

class UpdateAffiliateRequest extends StoreAffiliateRequest
{
    /**
     * Another store's affiliate is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('affiliate'));
    }

    /**
     * Same rules as creation, except the password is optional (blank keeps the current one).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }

    protected function editedAffiliate(): ?Affiliate
    {
        return $this->route('affiliate');
    }

    protected function passwordPresence(): string
    {
        return 'nullable';
    }
}
