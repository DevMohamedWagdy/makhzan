<?php

namespace App\Enums;

enum AffiliateStatus: string
{
    case Active = 'active';
    case Frozen = 'frozen';
    case Pending = 'pending';
}
