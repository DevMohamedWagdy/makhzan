<?php

namespace App\Enums;

/**
 * Features a plan can include on top of its limits.
 */
enum PlanFeature: string
{
    /** Adding affiliates and the public affiliate registration link. */
    case Affiliates = 'affiliates';

    /** Card and wallet payments through the store's own Paymob account. */
    case OnlinePayments = 'online_payments';

    /** Serving the storefront on the vendor's own domain. */
    case CustomDomain = 'custom_domain';

    /** Sending orders to Meta, TikTok and Google from the server (Conversions API and alike). */
    case ConversionsApi = 'conversions_api';
    /** Loyalty points customers earn on delivered orders and spend at checkout. */
    case Loyalty = 'loyalty';
}
