<?php

namespace App\Models;

use Database\Factories\CustomerAddressFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark', 'is_default'])]
class CustomerAddress extends Model
{
    /** @use HasFactory<CustomerAddressFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * The fields copied onto an order.
     *
     * @return array{recipient_name: string, phone: string, governorate_id: string, city_id: string, address_line: string, landmark: string|null}
     */
    public function toOrderAddress(): array
    {
        return $this->only(['recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark']);
    }
}
