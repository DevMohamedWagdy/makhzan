<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\SaveAddressRequest;
use App\Http\Resources\CustomerAddressResource;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    /**
     * The customer's address book, default first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CustomerAddressResource::collection($request->user()->addresses()->get());
    }

    public function store(SaveAddressRequest $request, Store $store): JsonResponse
    {
        $address = $this->save($request->user(), $request->validated());

        return (new CustomerAddressResource($address))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(SaveAddressRequest $request, Store $store, int $address): CustomerAddressResource
    {
        return new CustomerAddressResource($this->save($request->user(), $request->validated(), $this->find($request, $address)));
    }

    public function destroy(Request $request, Store $store, int $address): Response
    {
        $this->find($request, $address)->delete();

        return response()->noContent();
    }

    /**
     * Saves the address; the first one, or one marked default, becomes the only default.
     *
     * @param  array<string, mixed>  $data
     */
    public static function save(Customer $customer, array $data, ?CustomerAddress $address = null): CustomerAddress
    {
        return DB::transaction(function () use ($customer, $data, $address): CustomerAddress {
            $makeDefault = ($data['is_default'] ?? false) || ! $customer->addresses()->exists();

            if ($makeDefault) {
                $customer->addresses()->update(['is_default' => false]);
            }

            $address ??= $customer->addresses()->make();
            $address->fill([...$data, 'is_default' => $makeDefault || $address->is_default])->save();

            return $address;
        });
    }

    private function find(Request $request, int $address): CustomerAddress
    {
        return $request->user()->addresses()->findOrFail($address);
    }
}
