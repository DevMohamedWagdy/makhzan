<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerAddress>
 */
class CustomerAddressFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'recipient_name' => fake()->name(),
            'phone' => '011'.fake()->numerify('########'),
            'governorate_id' => 'cairo',
            'city_id' => 'nasr_city',
            'address_line' => fake()->streetAddress(),
            'landmark' => null,
            'is_default' => false,
        ];
    }
}
