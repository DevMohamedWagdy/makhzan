<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VendorEmailCampaignResource;
use App\Jobs\SendVendorEmailCampaign;
use App\Models\Vendor;
use App\Models\VendorEmailCampaign;
use App\Support\ActivityLogger;
use App\Support\PhoneNumber;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Emails from the platform team to merchants: to every active store owner or to the ones picked, sent
 * right after the response, with the history of what went out.
 */
class VendorEmailCampaignController extends Controller
{
    /**
     * The sending history, newest first, with how many merchants an email to "all" would reach.
     */
    public function index(): AnonymousResourceCollection
    {
        return VendorEmailCampaignResource::collection(VendorEmailCampaign::query()->with('admin')->latest('id')->paginate(15))
            ->additional(['eligible_count' => VendorEmailCampaign::eligibleRecipients()->count()]);
    }

    /**
     * Store owners who can be picked, searchable by name, email, phone or store.
     */
    public function recipients(Request $request): JsonResponse
    {
        $search = $request->validate(['search' => ['nullable', 'string', 'max:100']])['search'] ?? null;

        $vendors = VendorEmailCampaign::eligibleRecipients()
            ->with('ownedStore')
            ->when($search, fn (Builder $query, string $term) => $query->where(fn (Builder $query) => $query
                ->where('full_name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('phone', 'like', '%'.PhoneNumber::normalize($term).'%')
                ->orWhereHas('ownedStore', fn (Builder $query) => $query->where('name', 'like', "%{$term}%"))))
            ->latest('id')
            ->limit(30)
            ->get();

        return response()->json(['data' => $vendors->map(fn (Vendor $vendor): array => [
            'vendor_id' => $vendor->id,
            'full_name' => $vendor->full_name,
            'email' => $vendor->email,
            'store' => $vendor->ownedStore?->name,
        ])]);
    }

    /**
     * Records the email and sends it once the response is out, so the admin isn't kept waiting.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'audience' => ['required', Rule::in([VendorEmailCampaign::AUDIENCE_ALL, VendorEmailCampaign::AUDIENCE_SELECTED])],
            'vendor_ids' => ['exclude_unless:audience,'.VendorEmailCampaign::AUDIENCE_SELECTED, 'required', 'array', 'min:1', 'max:1000'],
            'vendor_ids.*' => ['integer', 'distinct'],
            'subject' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $selected = $validated['audience'] === VendorEmailCampaign::AUDIENCE_SELECTED;
        // Only picked accounts that can still receive email (active owners with an address) count.
        $recipientIds = $selected ? VendorEmailCampaign::eligibleRecipients()->whereKey($validated['vendor_ids'])->pluck('id')->all() : null;
        $recipientsCount = $selected ? count($recipientIds) : VendorEmailCampaign::eligibleRecipients()->count();

        if ($recipientsCount === 0) {
            throw ValidationException::withMessages([$selected ? 'vendor_ids' : 'audience' => __('settings.vendor_email_no_recipients')]);
        }

        $campaign = VendorEmailCampaign::query()->create([
            'admin_id' => $request->user()->id,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'audience' => $validated['audience'],
            'recipient_ids' => $recipientIds,
            'recipients_count' => $recipientsCount,
        ]);

        ActivityLogger::log('vendor_email_campaign.sent', $campaign, ['new' => ['subject' => $campaign->subject, 'recipients_count' => $recipientsCount]], label: $campaign->subject);

        SendVendorEmailCampaign::dispatchAfterResponse($campaign);

        return (new VendorEmailCampaignResource($campaign->load('admin')))
            ->additional(['message' => __('settings.vendor_email_queued', ['count' => $recipientsCount])])
            ->response()
            ->setStatusCode(201);
    }
}
