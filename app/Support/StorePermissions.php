<?php

namespace App\Support;

/**
 * What a store's staff can be allowed to do, as "section.action" keys grouped into roles.
 * Owners hold everything. Routes are guarded per section (`permission:orders`): the action
 * follows the HTTP method (GET = view, POST = create, PUT/PATCH = update, DELETE = delete)
 * unless the route names one (`->defaults('_permission', 'orders.ship')`).
 */
class StorePermissions
{
    /** @var array<string, list<string>> */
    public const CATALOG = [
        'orders' => ['view', 'create', 'update', 'ship'],
        'products' => ['view', 'create', 'update', 'delete'],
        'inventory' => ['view', 'update', 'transfer', 'warehouses'],
        'purchasing' => ['view', 'create', 'update', 'delete'],
        'customers' => ['view'],
        'reviews' => ['view', 'update', 'delete'],
        'marketing' => ['view', 'create', 'update', 'delete', 'payouts', 'impersonate'],
        'payments' => ['view', 'refund', 'settings'],
        'reports' => ['view'],
        'settings' => ['view', 'update'],
        'support' => ['view', 'create'],
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

    public static function exists(string $permission): bool
    {
        return in_array($permission, self::all(), true);
    }

    /**
     * The permission a request needs inside a section: the route's own, or one derived from
     * the HTTP method (falling back to "update" for sections without that action).
     */
    public static function forRequest(string $section, string $method, ?string $routePermission): string
    {
        if ($routePermission) {
            return $routePermission;
        }

        $action = match (strtoupper($method)) {
            'GET', 'HEAD' => 'view',
            'POST' => 'create',
            'DELETE' => 'delete',
            default => 'update',
        };

        return in_array($action, self::CATALOG[$section] ?? [], true) ? "{$section}.{$action}" : "{$section}.update";
    }

    /**
     * Every action of the given sections, for upgrading section-level grants.
     *
     * @param  list<string>  $sections
     * @return list<string>
     */
    public static function forSections(array $sections): array
    {
        return array_values(array_filter(self::all(), fn (string $permission): bool => in_array(strtok($permission, '.'), $sections, true)));
    }
}
