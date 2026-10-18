<?php

namespace App\Enums;

enum SupportTicketStatus: string
{
    /** Waiting on the platform team or the merchant; both sides can reply. */
    case Open = 'open';

    /** Resolved by the platform team; no replies until an admin reopens it. */
    case Closed = 'closed';
}
