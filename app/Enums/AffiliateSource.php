<?php

namespace App\Enums;

enum AffiliateSource: string
{
    case Manual = 'manual';
    case SelfRegistration = 'self_registration';
    case BulkImport = 'bulk_import';
}
