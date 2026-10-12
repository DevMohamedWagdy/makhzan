<?php

namespace Tests;

use App\Models\Vendor;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Symfony's test requests send "Accept-Language: en-us" by default; send the app's
     * default language instead, as the SPA does for Arabic users.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Accept-Language', 'ar');
    }

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
