<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Actions\Affiliates\CreateAffiliate;
use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Public\RegisterAffiliateRequest;
use App\Http\Resources\AffiliateRegistrationLinkPublicResource;
use App\Models\AffiliateRegistrationLink;
use App\Notifications\AffiliateRegisteredNotification;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class AffiliateRegistrationController extends Controller
{
    /**
     * Store details shown on the public "join our affiliates" page.
     */
    public function show(AffiliateRegistrationLink $registrationLink): AffiliateRegistrationLinkPublicResource
    {
        abort_unless($registrationLink->is_enabled, Response::HTTP_NOT_FOUND, 'رابط التسجيل غير صالح أو متوقف حالياً');

        return new AffiliateRegistrationLinkPublicResource($registrationLink->load('store'));
    }

    /**
     * Registers an applicant. With auto-approve on they become active immediately and get a
     * referral code; otherwise they wait in the vendor's "pending review" list. Either way
     * the vendor is notified.
     */
    public function store(RegisterAffiliateRequest $request, AffiliateRegistrationLink $registrationLink, CreateAffiliate $createAffiliate): JsonResponse
    {
        $status = $registrationLink->auto_approve ? AffiliateStatus::Active : AffiliateStatus::Pending;

        try {
            $affiliate = $createAffiliate->handle(
                $registrationLink->store,
                [...$request->safe()->except('password_confirmation'), 'tier' => $registrationLink->default_tier->value],
                AffiliateSource::SelfRegistration,
                $status,
            );
        } catch (UniqueConstraintViolationException) {
            // A double-submit can pass validation twice; the (store_id, phone) index is the real guard.
            throw ValidationException::withMessages(['phone' => 'هذا الرقم مسجل بالفعل ضمن مسوقي هذا المتجر']);
        }

        $registrationLink->store->vendor->notify(new AffiliateRegisteredNotification($affiliate));

        $referralCode = $affiliate->referralCodes()->first();

        return response()->json([
            'affiliate_id' => $affiliate->id,
            'full_name' => $affiliate->full_name,
            'status' => $affiliate->status,
            'requires_approval' => $status === AffiliateStatus::Pending,
            'referral_code' => $referralCode?->code,
            'referral_url' => $referralCode ? $registrationLink->store->storefrontUrl('?ref='.$referralCode->code) : null,
            'message' => $status === AffiliateStatus::Pending
                ? 'تم استلام طلب انضمامك، وسيتم إشعارك فور موافقة صاحب المتجر.'
                : 'تم تسجيلك بنجاح! يمكنك البدء في مشاركة رابط الإحالة الخاص بك الآن.',
        ], Response::HTTP_CREATED);
    }
}
