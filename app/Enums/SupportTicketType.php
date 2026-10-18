<?php

namespace App\Enums;

enum SupportTicketType: string
{
    /** Something isn't working for the merchant. */
    case Problem = 'problem';

    /** An idea for improving the platform. */
    case Suggestion = 'suggestion';
}
