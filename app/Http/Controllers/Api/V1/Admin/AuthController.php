<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\AdminLoginRequest;
use App\Models\Admin;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function login(AdminLoginRequest $request): JsonResponse
    {
        $admin = $request->authenticate();
        $admin->forceFill(['last_login_at' => now()])->save();
        ActivityLogger::log('admin.login', $admin, actor: $admin);

        return response()->json(['token' => $admin->issueToken(), 'admin' => $this->profile($admin)]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->profile($request->user())]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /**
     * @return array{admin_id: int, full_name: string, email: string, is_super: bool, role: string|null, permissions: list<string>}
     */
    private function profile(Admin $admin): array
    {
        return [
            'admin_id' => $admin->id,
            'full_name' => $admin->full_name,
            'email' => $admin->email,
            'is_super' => $admin->is_super,
            'role' => $admin->role?->name,
            'permissions' => $admin->grantedPermissions(),
        ];
    }
}
