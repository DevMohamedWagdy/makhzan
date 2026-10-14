<?php

namespace App\Http\Resources;

use App\Notifications\AffiliateCouponNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

/**
 * @mixin DatabaseNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'message' => $this->message(),
            'details' => collect($this->data)->except('message'),
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * The notification text in the current request's language, built from its stored details.
     */
    private function message(): string
    {
        $details = $this->data;

        return match ($this->type) {
            'payout_requested' => __('notifications.payout_requested.message', [
                'affiliate' => $details['affiliate_name'],
                'amount' => number_format((float) $details['amount'], 2),
            ]),
            'affiliate_registered' => __($details['requires_approval'] ? 'notifications.affiliate_registered.pending' : 'notifications.affiliate_registered.active', [
                'affiliate' => $details['affiliate_name'],
            ]),
            'order_placed' => __(($details['paid_online'] ?? false) ? 'notifications.order_placed.message_paid' : 'notifications.order_placed.message', [
                'number' => $details['number'],
                'customer' => $details['customer_name'],
                'total' => number_format((float) $details['total'], 2),
            ]),
            'late_payment' => __('notifications.late_payment.message', [
                'number' => $details['number'],
                'total' => number_format((float) $details['total'], 2),
            ]),
            'account_approved', 'account_frozen', 'account_reactivated' => __("notifications.{$this->type}.message", ['store' => $details['store_name']]),
            'payout_paid', 'payout_rejected' => __("notifications.{$this->type}.message", ['amount' => number_format((float) $details['amount'], 2)]),
            'referral_order_placed', 'commission_earned', 'commission_cancelled', 'commission_reversed' => __("notifications.{$this->type}", [
                'number' => $details['number'],
                'commission' => number_format((float) $details['commission'], 2),
            ]),
            'commission_changed' => __($details['type'] === 'fixed' ? 'notifications.commission_changed.fixed' : 'notifications.commission_changed.percentage', [
                'value' => $details['type'] === 'fixed' ? number_format((float) $details['value'], 2) : rtrim(rtrim(number_format((float) $details['value'], 2), '0'), '.'),
            ]),
            'stock_out', 'stock_low' => __("notifications.{$this->type}", [
                'product' => trim($details['product_name'].($details['variant_title'] ? " ({$details['variant_title']})" : '')),
                'stock' => $details['stock'],
            ]),
            'review_submitted' => __('notifications.review_submitted', [
                'rating' => $details['rating'],
                'customer' => $details['customer_name'],
                'product' => $details['product_name'],
            ]),
            'coupon_assigned' => AffiliateCouponNotification::message($details['code'], $details['type'], $details['value']),
            'subscription_activated', 'subscription_rejected', 'subscription_expiring', 'trial_ending' => __("notifications.{$this->type}.message", [
                'plan' => $details['plan_name'],
                'date' => $details['ends_at'] ? Carbon::parse($details['ends_at'])->translatedFormat('j F Y') : '',
            ]),
            'store_registered' => __('notifications.admin.store_registered', ['store' => $details['store_name'], 'owner' => $details['owner_name'] ?? '']),
            'subscription_requested' => __('notifications.admin.subscription_requested', ['store' => $details['store_name'], 'plan' => $details['plan_name'], 'amount' => number_format((float) $details['amount'], 2)]),
            'trial_ended' => __('notifications.admin.trial_ended', ['store' => $details['store_name']]),
            default => $details['message'] ?? '',
        };
    }
}
