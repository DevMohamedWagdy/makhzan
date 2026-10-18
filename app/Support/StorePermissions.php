<?php

namespace App\Support;

/**
 * What a store's staff can be allowed to do, as "section.action" keys grouped into roles.
 * Owners hold everything. Routes are guarded per section (`permission:orders`): the action
 * follows the HTTP method (GET = view, POST = create, PUT/PATCH = update, DELETE = delete)
 * unless the route names one (`->defaults('_permission', 'orders.ship')`). A route can accept
 * any of several permissions with "|" (`'categories.view|products.view'`), for lists other
 * features look things up in.
 */
class StorePermissions
{
    /**
     * One section per dashboard feature, so the owner decides exactly what each role can see.
     * Staff management and the subscription stay with the owner.
     *
     * @var array<string, list<string>>
     */
    public const CATALOG = [
        'dashboard' => ['view'],
        'notifications' => ['view'],
        'orders' => ['view', 'create', 'update', 'ship'],
        'payments' => ['view', 'refund', 'settings'],
        'customers' => ['view'],
        'reviews' => ['view', 'update', 'delete'],
        'shipping' => ['view', 'update'],
        'products' => ['view', 'create', 'update', 'delete'],
        'categories' => ['view', 'create', 'update', 'delete'],
        'collections' => ['view', 'create', 'update', 'delete'],
        'inventory' => ['view', 'update', 'transfer'],
        'warehouses' => ['view', 'create', 'update', 'delete'],
        'purchasing' => ['view', 'create', 'update', 'delete'],
        'suppliers' => ['view', 'create', 'update', 'delete'],
        'affiliates' => ['view', 'create', 'update', 'delete', 'impersonate'],
        'payouts' => ['view', 'update'],
        'coupons' => ['view', 'create', 'update', 'delete'],
        'loyalty' => ['view', 'update'],
        'reports' => ['view'],
        'activity' => ['view'],
        'settings' => ['view', 'update'],
        'support' => ['view', 'create'],
    ];

    /**
     * The store's notifications (types in the owner's inbox, which staff share) and the
     * permissions that let staff see each one; any of them is enough. Kinds not listed, like
     * subscription reminders, stay with the owner.
     *
     * @var array<string, list<string>>
     */
    public const NOTIFICATIONS = [
        'order_placed' => ['orders.view'],
        'late_payment' => ['orders.view', 'payments.view'],
        'stock_out' => ['inventory.view', 'products.view'],
        'stock_low' => ['inventory.view', 'products.view'],
        'payout_requested' => ['payouts.view'],
        'affiliate_registered' => ['affiliates.view'],
        'review_submitted' => ['reviews.view'],
        'ticket_replied' => ['support.view'],
        'ticket_closed' => ['support.view'],
        'ticket_reopened' => ['support.view'],
    ];

    /**
     * How each permission of the earlier, coarser catalog maps onto this one (used to upgrade
     * saved roles). A permission not listed kept its key.
     *
     * @var array<string, list<string>>
     */
    public const LEGACY = [
        'products.view' => ['products.view', 'categories.view', 'collections.view'],
        'products.create' => ['products.create', 'categories.create', 'collections.create'],
        'products.update' => ['products.update', 'categories.update', 'collections.update'],
        'products.delete' => ['products.delete', 'categories.delete', 'collections.delete'],
        'inventory.view' => ['inventory.view', 'warehouses.view'],
        'inventory.warehouses' => ['warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete'],
        'purchasing.view' => ['purchasing.view', 'suppliers.view'],
        'purchasing.create' => ['purchasing.create', 'suppliers.create'],
        'purchasing.update' => ['purchasing.update', 'suppliers.update'],
        'purchasing.delete' => ['purchasing.delete', 'suppliers.delete'],
        'marketing.view' => ['affiliates.view', 'payouts.view', 'coupons.view', 'loyalty.view'],
        'marketing.create' => ['affiliates.create', 'coupons.create'],
        'marketing.update' => ['affiliates.update', 'coupons.update', 'loyalty.update'],
        'marketing.delete' => ['affiliates.delete', 'coupons.delete'],
        'marketing.payouts' => ['payouts.update'],
        'marketing.impersonate' => ['affiliates.impersonate'],
        'settings.view' => ['settings.view', 'shipping.view'],
        'settings.update' => ['settings.update', 'shipping.update'],
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
     * A role's permissions saved under the earlier catalog, translated to this one.
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function upgrade(array $permissions): array
    {
        return collect($permissions)
            ->flatMap(fn (string $permission): array => self::LEGACY[$permission] ?? [$permission])
            ->filter(fn (string $permission): bool => self::exists($permission))
            ->unique()
            ->values()
            ->all();
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
