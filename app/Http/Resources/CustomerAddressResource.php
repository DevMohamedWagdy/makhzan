<?php

namespace App\Http\Resources;

use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CustomerAddress
 */
class CustomerAddressResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'address_id' => $this->id,
            'recipient_name' => $this->recipient_name,
            'phone' => $this->phone,
            'governorate_id' => $this->governorate_id,
            'city_id' => $this->city_id,
            'address_line' => $this->address_line,
            'landmark' => $this->landmark,
            'is_default' => $this->is_default,
        ];
    }
}
