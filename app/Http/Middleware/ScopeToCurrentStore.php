<?php

namespace App\Http\Middleware;

use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\Store;
use App\Models\Vendor;
use App\Support\CurrentStore;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pins the request to the signed-in vendor's, affiliate's or customer's store, so
 * store-owned models (and route model binding) only see that store's rows.
 *
 * Runs before SubstituteBindings (see bootstrap/app.php), which in turn runs before
 * auth:sanctum, so it reads the token itself. It never rejects a request: the auth and
 * token middleware after it still do that.
 */
class ScopeToCurrentStore
{
    public function __construct(private CurrentStore $currentStore) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $this->currentStore->set($this->storeIdFor($request->user('sanctum')));

        try {
            return $next($request);
        } finally {
            $this->currentStore->forget();
        }
    }

    private function storeIdFor(mixed $user): ?int
    {
        return match (true) {
            $user instanceof Vendor => $user->store_id ?? Store::query()->where('vendor_id', $user->id)->value('id'),
            $user instanceof Affiliate, $user instanceof Customer => $user->store_id,
            default => null,
        };
    }
}
