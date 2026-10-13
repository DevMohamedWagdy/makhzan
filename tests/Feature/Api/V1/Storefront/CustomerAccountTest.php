<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion';

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::factory()->create(['slug' => 'noor-fashion']);
    }

    public function test_registers_and_signs_in_a_customer(): void
    {
        $token = $this->postJson(self::BASE.'/customer/register', [
            'full_name' => 'منى أحمد',
            'phone' => '010 1234 5678',
            'email' => 'Mona@Example.com',
            'password' => 'Shopper2026',
            'password_confirmation' => 'Shopper2026',
        ])->assertCreated()->assertJsonPath('customer.phone', '01012345678')->json('token');

        $customer = Customer::sole();
        $this->assertTrue($customer->store->is($this->store));
        $this->assertSame('mona@example.com', $customer->email);

        $this->withToken($token)->getJson(self::BASE.'/customer/me')->assertOk()->assertJsonPath('data.full_name', 'منى أحمد');
    }

    public function test_the_same_phone_can_register_in_another_store_but_not_twice_in_one(): void
    {
        Customer::factory()->for($this->store)->create(['phone' => '01012345678']);
        Customer::factory()->create(['phone' => '01099999999']);
        $payload = ['full_name' => 'منى أحمد', 'password' => 'Shopper2026', 'password_confirmation' => 'Shopper2026'];

        $this->postJson(self::BASE.'/customer/register', [...$payload, 'phone' => '01012345678'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'هذا الرقم مسجل بالفعل، سجّل الدخول بدلاً من إنشاء حساب جديد']);
        $this->postJson(self::BASE.'/customer/register', [...$payload, 'phone' => '01099999999'])->assertCreated();
    }

    public function test_logs_in_with_phone_or_email_and_rejects_wrong_passwords(): void
    {
        Customer::factory()->for($this->store)->create(['phone' => '01012345678', 'email' => 'mona@example.com', 'password' => 'Shopper2026']);

        $this->postJson(self::BASE.'/customer/login', ['identifier' => '01012345678', 'password' => 'Shopper2026'])->assertOk()->assertJsonStructure(['token', 'customer']);
        $this->postJson(self::BASE.'/customer/login', ['identifier' => 'MONA@example.com', 'password' => 'Shopper2026'])->assertOk();
        $this->postJson(self::BASE.'/customer/login', ['identifier' => '01012345678', 'password' => 'wrong-pass1'])->assertUnprocessable()->assertJsonValidationErrors('identifier');
    }

    public function test_a_customer_token_only_works_in_its_own_store(): void
    {
        $customer = Customer::factory()->for($this->store)->create();
        Store::factory()->create(['slug' => 'other-store']);
        Sanctum::actingAs($customer, [Customer::TOKEN_ABILITY]);

        $this->getJson(self::BASE.'/customer/me')->assertOk();
        $this->getJson('/api/v1/storefront/other-store/customer/me')->assertUnauthorized();
    }

    public function test_manages_the_address_book_with_a_single_default(): void
    {
        $customer = Customer::factory()->for($this->store)->create();
        Sanctum::actingAs($customer, [Customer::TOKEN_ABILITY]);
        $address = ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'giza', 'city_id' => 'dokki', 'address_line' => '12 شارع التحرير'];

        $first = $this->postJson(self::BASE.'/customer/addresses', $address)->assertCreated()->assertJsonPath('data.is_default', true)->json('data.address_id');
        $second = $this->postJson(self::BASE.'/customer/addresses', [...$address, 'is_default' => true])->assertCreated()->json('data.address_id');

        $this->assertFalse(CustomerAddress::find($first)->is_default);
        $this->getJson(self::BASE.'/customer/addresses')->assertJsonPath('data.0.address_id', $second);

        $this->postJson(self::BASE.'/customer/addresses', [...$address, 'city_id' => 'nasr_city'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['city_id' => 'المدينة لا تتبع المحافظة المختارة']);

        $this->deleteJson(self::BASE."/customer/addresses/{$first}")->assertNoContent();
        $foreign = CustomerAddress::factory()->create();
        $this->deleteJson(self::BASE."/customer/addresses/{$foreign->id}")->assertNotFound();
    }
}
