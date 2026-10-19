<?php

namespace App\Http\Requests\Api\V1\Public;

use App\Http\Requests\Api\V1\Vendor\StoreAffiliateRequest;
use App\Models\AffiliateRegistrationLink;
use App\Models\Store;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;

/**
 * Self-registration through a store's public link. Same profile and payout rules as a
 * vendor adding an affiliate, but the applicant can't choose a tier or upload files:
 * the tier comes from the link settings.
 */
class RegisterAffiliateRequest extends StoreAffiliateRequest
{
    /**
     * A disabled link behaves exactly like an unknown one (404), before any validation runs.
     */
    public function authorize(): Response
    {
        return $this->registrationLink()->is_enabled
            ? Response::allow()
            : Response::denyAsNotFound(__('affiliates.registration_link_invalid'));
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return Arr::except(parent::rules(), ['tier', 'avatar']);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'full_name.required' => __('forms.full_name_required'),
            'phone.required' => __('forms.phone_required'),
            'phone.unique' => __('affiliates.phone_taken_in_store'),
            'email.required' => __('forms.email_required'),
            'email.unique' => __('affiliates.email_taken_in_store'),
            'password.required' => __('forms.password_required'),
        ];
    }

    public function registrationLink(): AffiliateRegistrationLink
    {
        return $this->route('registrationLink');
    }

    protected function targetStore(): Store
    {
        return $this->registrationLink()->store;
    }
}
