<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Models\Customer;
use App\Notifications\CustomerResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CustomerPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_MESSAGE = 'إذا كان لحسابك بريد إلكتروني مسجل، ستصلك رسالة بها رابط لتعيين كلمة مرور جديدة خلال دقائق.';

    private function forgotUrl(Customer $customer): string
    {
        return "/api/v1/storefront/{$customer->store->slug}/customer/forgot-password";
    }

    private function resetUrl(Customer $customer): string
    {
        return "/api/v1/storefront/{$customer->store->slug}/customer/reset-password";
    }

    /**
     * Requests a link and returns the plain token captured from the notification.
     */
    private function requestToken(Customer $customer): string
    {
        Notification::fake();

        $this->postJson($this->forgotUrl($customer), ['identifier' => $customer->phone])->assertOk();

        $token = null;
        Notification::assertSentTo($customer, CustomerResetPasswordNotification::class, function (CustomerResetPasswordNotification $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        return $token;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function resetPayload(Customer $customer, string $token, array $overrides = []): array
    {
        return [
            'customer_id' => $customer->id,
            'token' => $token,
            'password' => 'BrandNew2026',
            'password_confirmation' => 'BrandNew2026',
            ...$overrides,
        ];
    }

    public function test_forgot_password_by_phone_emails_a_store_scoped_link(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create(['email' => 'mona@example.com', 'phone' => '01055556666']);

        $this->postJson($this->forgotUrl($customer), ['identifier' => '010 5555 6666'])
            ->assertOk()
            ->assertExactJson(['message' => self::GENERIC_MESSAGE]);

        Notification::assertSentTo($customer, CustomerResetPasswordNotification::class, function (CustomerResetPasswordNotification $notification) use ($customer): bool {
            return $notification->resetUrl($customer) === url("/{$customer->store->slug}/account/reset-password")."?id={$customer->id}&token={$notification->token}";
        });
        $this->assertDatabaseHas('customer_password_reset_tokens', ['customer_id' => $customer->id]);
    }

    public function test_forgot_password_by_email_works(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create(['email' => 'mona@example.com']);

        $this->postJson($this->forgotUrl($customer), ['identifier' => 'MONA@example.com'])->assertOk();

        Notification::assertSentTo($customer, CustomerResetPasswordNotification::class);
    }

    public function test_unknown_accounts_and_accounts_without_email_get_the_same_response_and_no_email(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create(['email' => null]);

        $this->postJson($this->forgotUrl($customer), ['identifier' => $customer->phone])
            ->assertOk()
            ->assertExactJson(['message' => self::GENERIC_MESSAGE]);
        $this->postJson($this->forgotUrl($customer), ['identifier' => '01299999999'])
            ->assertOk()
            ->assertExactJson(['message' => self::GENERIC_MESSAGE]);

        Notification::assertNothingSent();
    }

    public function test_a_customer_of_another_store_is_not_found(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create();
        $otherStoreCustomer = Customer::factory()->create();

        $this->postJson($this->forgotUrl($customer), ['identifier' => $otherStoreCustomer->phone])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_reset_sets_the_password_signs_out_everywhere_and_consumes_the_token(): void
    {
        $customer = Customer::factory()->create();
        $customer->issueToken(remember: true);
        $token = $this->requestToken($customer);

        $this->postJson($this->resetUrl($customer), $this->resetPayload($customer, $token))->assertOk();

        $this->assertTrue(Hash::check('BrandNew2026', $customer->fresh()->password));
        $this->assertSame(0, $customer->tokens()->count());
        $this->assertDatabaseMissing('customer_password_reset_tokens', ['customer_id' => $customer->id]);

        $this->postJson($this->resetUrl($customer), $this->resetPayload($customer, $token))->assertJsonValidationErrors('token');
    }

    public function test_wrong_or_expired_tokens_are_rejected(): void
    {
        $customer = Customer::factory()->create();
        $token = $this->requestToken($customer);

        $this->postJson($this->resetUrl($customer), $this->resetPayload($customer, 'wrong-token'))->assertJsonValidationErrors('token');

        $this->travel(61)->minutes();

        $this->postJson($this->resetUrl($customer), $this->resetPayload($customer, $token))->assertJsonValidationErrors('token');
    }

    public function test_a_token_cannot_reset_a_customer_through_another_store(): void
    {
        $customer = Customer::factory()->create();
        $otherStoreCustomer = Customer::factory()->create();
        $token = $this->requestToken($customer);

        $this->postJson($this->resetUrl($otherStoreCustomer), $this->resetPayload($customer, $token))->assertJsonValidationErrors('token');
    }

    public function test_weak_passwords_are_rejected(): void
    {
        $customer = Customer::factory()->create();
        $token = $this->requestToken($customer);

        $this->postJson($this->resetUrl($customer), $this->resetPayload($customer, $token, ['password' => 'short', 'password_confirmation' => 'short']))
            ->assertJsonValidationErrors('password');
    }
}
