<?php

namespace App\Support;

/**
 * What platform team members can be allowed to do, as "section.action" keys grouped into
 * admin roles. Super admins hold everything, including managing the team.
 */
class AdminPermissions
{
    /** @var array<string, list<string>> */
    public const CATALOG = [
        'overview' => ['view'],
        'stores' => ['view', 'update', 'suspend', 'impersonate'],
        'vendors' => ['view', 'update'],
        'orders' => ['view', 'update'],
        'customers' => ['view'],
        'affiliates' => ['view', 'update'],
        'products' => ['view'],
        'payments' => ['view'],
        'coupons' => ['view'],
        'reviews' => ['view', 'update'],
        'tickets' => ['view', 'reply'],
        'logs' => ['view'],
        'team' => ['manage'],
    ];

    /**
     * Every permission key.
     *
     * @return list<string>
     */
    public static function all(): array
    {
        return collect(self::CATALOG)->flatMap(fn (array $actions, string $section): array => array_map(fn (string $action): string => "{$section}.{$action}", $actions))->values()->all();
    }
}
