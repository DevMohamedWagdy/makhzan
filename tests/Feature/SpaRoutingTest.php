<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpaRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function spaPaths(): array
    {
        return [
            'root' => ['/'],
            'login' => ['/login'],
            'register' => ['/register'],
            'forgot password' => ['/forgot-password'],
            'affiliate login page' => ['/noor-fashion/affiliates/login'],
            'affiliate dashboard' => ['/affiliate'],
            'affiliate forgot password' => ['/noor-fashion/affiliates/forgot-password'],
            'affiliate reset password link' => ['/noor-fashion/affiliates/reset-password?id=1&token=abc'],
            'affiliate join page' => ['/noor-fashion/affiliates/join?t=abc123'],
            'reset password link' => ['/reset-password?token=abc&email=owner%40example.com'],
            'affiliates dashboard' => ['/dashboard/affiliates?status=active'],
            'legacy affiliate portal' => ['/affiliate-portal'],
        ];
    }

    #[DataProvider('spaPaths')]
    public function test_client_routes_render_the_rtl_spa_shell(string $path): void
    {
        $this->get($path)
            ->assertOk()
            ->assertViewIs('app')
            ->assertSee('<html lang="ar" dir="rtl">', false)
            ->assertSee('<div id="app"></div>', false);
    }

    public function test_api_paths_are_not_swallowed_by_the_spa_route(): void
    {
        $this->getJson('/api/v1/does-not-exist')->assertNotFound()->assertJsonStructure(['message']);
    }
}
