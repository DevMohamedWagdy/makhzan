<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use App\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AffiliateImportControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/vendor/affiliates/import';

    public function test_imports_valid_rows_and_reports_invalid_ones_by_line(): void
    {
        $vendor = $this->actingAsVendor();
        Affiliate::factory()->for($vendor)->for($vendor->store)->create(['phone' => '01077778888']);

        $this->postJson(self::URL, ['rows' => [
            ['line' => 2, 'full_name' => 'علي محمود', 'phone' => '01011112222', 'tier' => 'vip', 'payout_type' => 'vodafone_cash'],
            ['line' => 3, 'full_name' => 'هدى سمير', 'phone' => '01133334444', 'tier' => 'مسوق عام', 'payout_type' => 'إنستاباي'],
            ['line' => 4, 'full_name' => '', 'phone' => '0101'],
            ['line' => 5, 'full_name' => 'موجود سابقاً', 'phone' => '01077778888'],
            ['line' => 6, 'full_name' => 'مكرر في الملف', 'phone' => '01011112222'],
            ['line' => 7, 'full_name' => 'شريحة خطأ', 'phone' => '01299990000', 'tier' => 'gold'],
        ]])->assertOk()->assertExactJson([
            'status' => 'completed',
            'imported' => 2,
            'skipped' => 4,
            'errors' => [
                ['row' => 4, 'message' => 'الاسم مطلوب'],
                ['row' => 5, 'message' => 'رقم الهاتف مسجل لمسوق آخر بالفعل'],
                ['row' => 6, 'message' => 'رقم الهاتف مسجل لمسوق آخر بالفعل'],
                ['row' => 7, 'message' => 'شريحة غير معروفة'],
            ],
        ]);

        $huda = Affiliate::firstWhere('phone', '01133334444');
        $this->assertSame(AffiliateTier::General, $huda->tier);
        $this->assertSame(PayoutMethod::InstaPay, $huda->payout_type);
        $this->assertSame(AffiliateSource::BulkImport, $huda->source);
        $this->assertNull($huda->password);
        $this->assertSame(1, $huda->referralCodes()->count());
    }

    #[TestWith(['أورانج كاش', PayoutMethod::OrangeCash])]
    #[TestWith(['WE كاش', PayoutMethod::WeCash])]
    #[TestWith(['اتصالات كاش', PayoutMethod::EtisalatCash])]
    public function test_resolves_arabic_wallet_labels(string $label, PayoutMethod $expected): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson(self::URL, ['rows' => [['full_name' => 'مريم عادل', 'phone' => '01255556666', 'payout_type' => $label]]])
            ->assertOk()
            ->assertJsonPath('imported', 1);

        $this->assertSame($expected, $vendor->store->affiliates()->sole()->payout_type);
    }

    public function test_imports_a_csv_upload_with_bom_and_defaults(): void
    {
        $vendor = $this->actingAsVendor();
        $csv = "\u{FEFF}full_name,phone,email\nسارة محمود,010 1234 5678,sara@example.com\nبدون هاتف,,\n";

        $this->post(self::URL, ['file' => UploadedFile::fake()->createWithContent('affiliates.csv', $csv)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('errors.0', ['row' => 3, 'message' => 'رقم الهاتف غير صحيح']);

        $sara = $vendor->store->affiliates()->firstWhere('phone', '01012345678');
        $this->assertSame(AffiliateTier::New, $sara->tier);
        $this->assertSame(PayoutMethod::VodafoneCash, $sara->payout_type);
        $this->assertSame('01012345678', $sara->payout_account_number);
    }

    public function test_rejects_excel_files_with_a_csv_hint(): void
    {
        $this->actingAsVendor();

        $this->post(self::URL, ['file' => UploadedFile::fake()->create('affiliates.xlsx', 10, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file' => 'نوع الملف غير مدعوم، احفظ ملف Excel بصيغة CSV ثم ارفعه']);
    }

    public function test_requires_a_file_or_rows(): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, [])->assertUnprocessable()->assertJsonValidationErrors(['file', 'rows']);
    }
}
