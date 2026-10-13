<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\StorePaymentGateway;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentSettingsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/vendor/payments';

    private const INTENTION_URL = 'https://accept.paymob.com/v1/intention/';

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        $this->vendor = $this->actingAsVendor();
    }

    /**
     * @return array<string, string|null>
     */
    private function paymob(array $overrides = []): array
    {
        return [
            'secret_key' => 'egy_sk_test_1234567890abcd',
            'public_key' => 'egy_pk_test_publickey',
            'hmac_secret' => 'HMACSECRET9876',
            'card_integration_id' => '4097558',
            'wallet_integration_id' => '4097559',
            ...$overrides,
        ];
    }

    public function test_connects_paymob_after_checking_each_integration_and_never_returns_secrets(): void
    {
        Http::fake([self::INTENTION_URL => Http::response(['id' => 'pi_check', 'client_secret' => 'x'], 201)]);

        $this->putJson(self::URL, ['paymob' => $this->paymob()])
            ->assertOk()
            ->assertJsonPath('data.methods', ['cod', 'card', 'wallet'])
            ->assertJsonPath('data.paymob.is_live', false)
            ->assertJsonPath('data.paymob.public_key', 'egy_pk_test_publickey')
            ->assertJsonPath('data.paymob.secret_key_hint', '••••abcd')
            ->assertJsonPath('data.paymob.hmac_secret_hint', '••••9876')
            ->assertJsonPath('data.webhook_url', route('api.v1.payments.paymob.webhook', $this->vendor->store))
            ->assertJsonMissing(['secret_key' => 'egy_sk_test_1234567890abcd'])
            ->assertJsonMissing(['hmac_secret' => 'HMACSECRET9876']);

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request): bool => $request->header('Authorization')[0] === 'Token egy_sk_test_1234567890abcd' && $request['payment_methods'] === [4097559]);
        $this->assertSame('egy_sk_test_1234567890abcd', $this->vendor->store->paymentGateway->credential('secret_key'));
        $this->assertStringNotContainsString('egy_sk_test', (string) DB::table('store_payment_gateways')->value('credentials'));
    }

    public function test_reports_the_field_paymob_rejects_and_saves_nothing(): void
    {
        Http::fake([self::INTENTION_URL => Http::sequence()->push(['detail' => 'Invalid token'], 401)->push(['detail' => 'Not found'], 404)]);

        $this->putJson(self::URL, ['paymob' => $this->paymob()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['paymob.secret_key' => 'الـ Secret Key غير صحيح']);

        $this->putJson(self::URL, ['paymob' => $this->paymob(['wallet_integration_id' => null])])
            ->assertJsonValidationErrors(['paymob.card_integration_id' => 'الـ Integration ID غير صحيح، أو غير مفعّل، أو من وضع مختلف عن المفاتيح (test/live)']);

        $this->assertNull($this->vendor->store->paymentGateway()->first());
    }

    public function test_validates_paymob_details_before_calling_paymob(): void
    {
        $this->putJson(self::URL, ['paymob' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'paymob.secret_key' => 'أدخل الـ Secret Key',
                'paymob.public_key' => 'أدخل الـ Public Key',
                'paymob.hmac_secret' => 'أدخل الـ HMAC Secret',
            ]);

        $this->putJson(self::URL, ['paymob' => $this->paymob(['card_integration_id' => null, 'wallet_integration_id' => null])])
            ->assertJsonValidationErrors(['paymob.card_integration_id' => 'أدخل Integration ID لطريقة دفع واحدة على الأقل']);

        $this->putJson(self::URL, ['paymob' => $this->paymob(['wallet_integration_id' => 'abc'])])
            ->assertJsonValidationErrors(['paymob.wallet_integration_id' => 'الـ Integration ID أرقام فقط']);

        $this->putJson(self::URL, ['paymob' => $this->paymob(['public_key' => 'egy_pk_live_publickey'])])
            ->assertJsonValidationErrors(['paymob.public_key' => 'المفتاحان ليسا من نفس الوضع: أحدهما تجريبي (test) والآخر حقيقي (live)']);

        Http::assertNothingSent();
    }

    public function test_keeps_saved_secrets_when_left_out_and_detects_live_keys(): void
    {
        $saved = StorePaymentGateway::factory()->for($this->vendor->store)->create();
        Http::fake([self::INTENTION_URL => Http::response(['id' => 'pi_check'], 201)]);

        $this->putJson(self::URL, ['paymob' => ['public_key' => 'egy_pk_test_newkey', 'card_integration_id' => '111']])
            ->assertOk()
            ->assertJsonPath('data.methods', ['cod', 'card'])
            ->assertJsonPath('data.paymob.public_key', 'egy_pk_test_newkey');

        $saved->refresh();
        $this->assertSame('111', $saved->credential('card_integration_id'));
        $this->assertNull($saved->credential('wallet_integration_id'));
        $this->assertStringStartsWith('egy_sk_test_', $saved->credential('secret_key'));

        $this->putJson(self::URL, ['paymob' => $this->paymob(['secret_key' => 'egy_sk_live_abcd', 'public_key' => 'egy_pk_live_efgh'])])
            ->assertOk()
            ->assertJsonPath('data.paymob.is_live', true);
    }

    public function test_cash_on_delivery_can_only_be_turned_off_with_online_payments(): void
    {
        $this->putJson(self::URL, ['cod_enabled' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cod_enabled' => 'فعّل طريقة دفع واحدة على الأقل لتستقبل الطلبات']);

        StorePaymentGateway::factory()->for($this->vendor->store)->create();

        $this->putJson(self::URL, ['cod_enabled' => false])->assertOk()->assertJsonPath('data.methods', ['card', 'wallet']);

        $this->deleteJson(self::URL.'/paymob')
            ->assertOk()
            ->assertJsonPath('data.paymob', null)
            ->assertJsonPath('data.cod_enabled', true)
            ->assertJsonPath('data.methods', ['cod']);
    }

    public function test_requires_a_vendor(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withToken('invalid')->getJson(self::URL)->assertUnauthorized();
    }
}
