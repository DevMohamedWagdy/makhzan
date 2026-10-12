<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateRegistrationLinkRequest;
use App\Http\Resources\RegistrationLinkResource;
use Illuminate\Http\Request;

class AffiliateRegistrationLinkController extends Controller
{
    /**
     * The store's public self-registration link (created with defaults on first access).
     */
    public function show(Request $request): RegistrationLinkResource
    {
        return new RegistrationLinkResource($request->user()->store->registrationLink());
    }

    /**
     * Toggle the link, the approval mode, or the default tier.
     */
    public function update(UpdateRegistrationLinkRequest $request): RegistrationLinkResource
    {
        $link = $request->user()->store->registrationLink();
        $link->update($request->validated());

        return new RegistrationLinkResource($link);
    }

    /**
     * Issue a new token; the previous public link stops working immediately.
     */
    public function regenerate(Request $request): RegistrationLinkResource
    {
        $link = $request->user()->store->registrationLink();
        $link->regenerate();

        return new RegistrationLinkResource($link);
    }
}
