<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\Governorate;
use App\Models\Order;
use App\Models\Store;
use App\Support\Locations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admins manage the governorates and cities stores deliver to; changes reach checkout validation and
 * the public list the app loads, and entries in use can only be deactivated.
 */
class AdminLocationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_starts_with_the_egyptian_governorates_and_their_cities(): void
    {
        $this->getJson('/api/v1/admin/locations')
            ->assertOk()
            ->assertJsonCount(24, 'data')
            ->assertJsonPath('data.0.id', 'cairo')
            ->assertJsonPath('data.0.name', 'القاهرة')
            ->assertJsonPath('data.0.cities.0.id', 'nasr_city');
    }

    public function test_adds_a_governorate_and_a_city_with_ids_made_from_the_english_name(): void
    {
        $this->postJson('/api/v1/admin/governorates', ['name' => 'مطروح', 'name_en' => 'Matrouh'])->assertOk();
        $this->postJson('/api/v1/admin/governorates/matrouh/cities', ['name' => 'مرسى مطروح', 'name_en' => 'Marsa Matrouh'])
            ->assertOk()
            ->assertJsonPath('data.24.id', 'matrouh')
            ->assertJsonPath('data.24.cities.0.id', 'marsa_matrouh');

        $this->assertContains('marsa_matrouh', Locations::activeCityIds('matrouh'));
        $this->getJson('/api/v1/locations')->assertJsonPath('data.24.cities.0.name_en', 'Marsa Matrouh');
    }

    public function test_a_taken_english_name_gets_a_suffixed_id_but_duplicate_names_are_refused(): void
    {
        Governorate::factory()->create(['id' => 'north_coast', 'name' => 'الساحل', 'name_en' => 'Coast']);

        $this->postJson('/api/v1/admin/governorates', ['name' => 'الساحل الشمالي', 'name_en' => 'North Coast'])->assertOk();
        $this->assertDatabaseHas('governorates', ['id' => 'north_coast_2', 'name_en' => 'North Coast']);

        $this->postJson('/api/v1/admin/governorates', ['name' => 'القاهرة', 'name_en' => 'Cairo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'name_en']);
    }

    public function test_city_names_only_need_to_be_unique_within_their_governorate(): void
    {
        $this->postJson('/api/v1/admin/governorates/giza/cities', ['name' => 'وسط البلد', 'name_en' => 'Downtown'])->assertOk();

        $this->postJson('/api/v1/admin/governorates/cairo/cities', ['name' => 'وسط البلد', 'name_en' => 'Downtown'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'name_en']);
    }

    public function test_deactivated_entries_leave_validation_but_stay_in_the_public_list(): void
    {
        $this->patchJson('/api/v1/admin/governorates/luxor', ['is_active' => false])->assertOk();
        $this->patchJson('/api/v1/admin/cities/maadi', ['is_active' => false])->assertOk();

        $this->assertNotContains('luxor', Locations::activeGovernorateIds());
        $this->assertNotContains('maadi', Locations::activeCityIds('cairo'));
        $this->getJson('/api/v1/locations')
            ->assertJsonPath('data.17.id', 'luxor')
            ->assertJsonPath('data.17.is_active', false);

        $store = Store::factory()->create(['slug' => 'noor-fashion', 'default_shipping_price' => 60]);
        $this->assertNotContains('luxor', array_column($this->getJson("/api/v1/storefront/{$store->slug}/shipping")->json('rates'), 'governorate_id'));
    }

    public function test_entries_in_use_cannot_be_deleted_but_unused_ones_can(): void
    {
        Order::factory()->create(['governorate_id' => 'cairo', 'city_id' => 'maadi']);

        $this->deleteJson('/api/v1/admin/cities/maadi')->assertUnprocessable()->assertJsonValidationErrors('city');
        $this->deleteJson('/api/v1/admin/governorates/cairo')->assertUnprocessable()->assertJsonValidationErrors('governorate');

        $this->deleteJson('/api/v1/admin/cities/shubra')->assertOk();
        $this->deleteJson('/api/v1/admin/governorates/aswan')->assertOk();

        $this->assertDatabaseMissing('cities', ['id' => 'shubra']);
        $this->assertDatabaseMissing('cities', ['id' => 'kom_ombo']);
        $this->assertDatabaseMissing('governorates', ['id' => 'aswan']);
    }

    public function test_managing_locations_needs_the_update_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['locations.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/locations')->assertOk();
        $this->postJson('/api/v1/admin/governorates', ['name' => 'مطروح', 'name_en' => 'Matrouh'])->assertForbidden();
        $this->patchJson('/api/v1/admin/cities/maadi', ['is_active' => false])->assertForbidden();
    }
}
