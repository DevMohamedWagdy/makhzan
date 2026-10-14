<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

/**
 * Demo platform admin for /admin/login. Local use only; real admins are created with
 * `php artisan makhzan:create-admin`.
 */
class DemoAdminSeeder extends Seeder
{
    public const EMAIL = 'admin@makhzan.app';

    public const PASSWORD = 'Admin@2026makhzan';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Admin::query()->firstOrCreate(['email' => self::EMAIL], ['full_name' => 'فريق مخزن', 'password' => self::PASSWORD, 'is_super' => true]);
    }
}
