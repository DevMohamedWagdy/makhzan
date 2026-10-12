<?php

namespace Tests;

use App\Models\Vendor;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Authenticates as a vendor (with a store) holding a dashboard token.
     */
    protected function actingAsVendor(?Vendor $vendor = null): Vendor
    {
        $vendor ??= Vendor::factory()->withStore()->create();

        Sanctum::actingAs($vendor, [Vendor::TOKEN_ABILITY]);

        return $vendor;
    }
}
