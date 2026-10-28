<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Governorates and cities move from config/makhzan.php and resources/js/lib/locations.js into the
 * database so the admin panel can manage them. Ids stay the stable strings already stored as
 * `governorate_id` / `city_id` on stores, orders, addresses, warehouses and shipping rates, and the
 * current list is inserted here so every install (and every test database) starts with it.
 */
return new class extends Migration
{
    /**
     * Governorate id => [Arabic name, English name, cities as id => [Arabic name, English name]].
     *
     * @var array<string, array{0: string, 1: string, 2: array<string, array{0: string, 1: string}>}>
     */
    private const LOCATIONS = [
        'cairo' => ['القاهرة', 'Cairo', ['nasr_city' => ['مدينة نصر', 'Nasr City'], 'heliopolis' => ['مصر الجديدة', 'Heliopolis'], 'maadi' => ['المعادي', 'Maadi'], 'new_cairo' => ['القاهرة الجديدة', 'New Cairo'], 'downtown' => ['وسط البلد', 'Downtown'], 'shubra' => ['شبرا', 'Shubra']]],
        'giza' => ['الجيزة', 'Giza', ['dokki' => ['الدقي', 'Dokki'], 'mohandessin' => ['المهندسين', 'Mohandessin'], 'october' => ['السادس من أكتوبر', '6th of October'], 'sheikh_zayed' => ['الشيخ زايد', 'Sheikh Zayed'], 'haram' => ['الهرم', 'Haram']]],
        'alexandria' => ['الإسكندرية', 'Alexandria', ['smouha' => ['سموحة', 'Smouha'], 'sidi_gaber' => ['سيدي جابر', 'Sidi Gaber'], 'miami' => ['ميامي', 'Miami'], 'borg_alarab' => ['برج العرب', 'Borg El Arab'], 'agami' => ['العجمي', 'Agami']]],
        'qalyubia' => ['القليوبية', 'Qalyubia', ['banha' => ['بنها', 'Banha'], 'shubra_elkheima' => ['شبرا الخيمة', 'Shubra El Kheima'], 'obour' => ['العبور', 'Obour'], 'qalyub' => ['قليوب', 'Qalyub']]],
        'dakahlia' => ['الدقهلية', 'Dakahlia', ['mansoura' => ['المنصورة', 'Mansoura'], 'talkha' => ['طلخا', 'Talkha'], 'mit_ghamr' => ['ميت غمر', 'Mit Ghamr']]],
        'sharqia' => ['الشرقية', 'Sharqia', ['zagazig' => ['الزقازيق', 'Zagazig'], 'tenth_ramadan' => ['العاشر من رمضان', '10th of Ramadan'], 'belbeis' => ['بلبيس', 'Belbeis']]],
        'gharbia' => ['الغربية', 'Gharbia', ['tanta' => ['طنطا', 'Tanta'], 'mahalla' => ['المحلة الكبرى', 'El Mahalla El Kubra'], 'kafr_elzayat' => ['كفر الزيات', 'Kafr El Zayat']]],
        'monufia' => ['المنوفية', 'Monufia', ['shebin' => ['شبين الكوم', 'Shebin El Kom'], 'sadat_city' => ['مدينة السادات', 'Sadat City'], 'menouf' => ['منوف', 'Menouf']]],
        'beheira' => ['البحيرة', 'Beheira', ['damanhour' => ['دمنهور', 'Damanhour'], 'kafr_eldawar' => ['كفر الدوار', 'Kafr El Dawar'], 'rashid' => ['رشيد', 'Rashid']]],
        'ismailia' => ['الإسماعيلية', 'Ismailia', ['ismailia_city' => ['الإسماعيلية', 'Ismailia'], 'fayed' => ['فايد', 'Fayed'], 'qantara' => ['القنطرة', 'Qantara']]],
        'port_said' => ['بورسعيد', 'Port Said', ['port_said_city' => ['بورسعيد', 'Port Said'], 'port_fouad' => ['بورفؤاد', 'Port Fouad']]],
        'suez' => ['السويس', 'Suez', ['suez_city' => ['السويس', 'Suez'], 'ain_sokhna' => ['العين السخنة', 'Ain Sokhna']]],
        'faiyum' => ['الفيوم', 'Faiyum', ['faiyum_city' => ['الفيوم', 'Faiyum'], 'sinnuris' => ['سنورس', 'Sinnuris']]],
        'minya' => ['المنيا', 'Minya', ['minya_city' => ['المنيا', 'Minya'], 'mallawi' => ['ملوي', 'Mallawi'], 'samalut' => ['سمالوط', 'Samalut']]],
        'asyut' => ['أسيوط', 'Asyut', ['asyut_city' => ['أسيوط', 'Asyut'], 'dayrut' => ['ديروط', 'Dayrut']]],
        'sohag' => ['سوهاج', 'Sohag', ['sohag_city' => ['سوهاج', 'Sohag'], 'akhmim' => ['أخميم', 'Akhmim'], 'girga' => ['جرجا', 'Girga']]],
        'qena' => ['قنا', 'Qena', ['qena_city' => ['قنا', 'Qena'], 'nag_hammadi' => ['نجع حمادي', 'Nag Hammadi']]],
        'luxor' => ['الأقصر', 'Luxor', ['luxor_city' => ['الأقصر', 'Luxor'], 'esna' => ['إسنا', 'Esna']]],
        'aswan' => ['أسوان', 'Aswan', ['aswan_city' => ['أسوان', 'Aswan'], 'kom_ombo' => ['كوم أمبو', 'Kom Ombo']]],
        'red_sea' => ['البحر الأحمر', 'Red Sea', ['hurghada' => ['الغردقة', 'Hurghada'], 'safaga' => ['سفاجا', 'Safaga'], 'marsa_alam' => ['مرسى علم', 'Marsa Alam']]],
        'south_sinai' => ['جنوب سيناء', 'South Sinai', ['sharm' => ['شرم الشيخ', 'Sharm El Sheikh'], 'dahab' => ['دهب', 'Dahab']]],
        'damietta' => ['دمياط', 'Damietta', ['damietta_city' => ['دمياط', 'Damietta'], 'new_damietta' => ['دمياط الجديدة', 'New Damietta'], 'ras_elbar' => ['رأس البر', 'Ras El Bar']]],
        'kafr_elsheikh' => ['كفر الشيخ', 'Kafr El Sheikh', ['kafr_elsheikh_city' => ['كفر الشيخ', 'Kafr El Sheikh'], 'desouk' => ['دسوق', 'Desouk']]],
        'beni_suef' => ['بني سويف', 'Beni Suef', ['beni_suef_city' => ['بني سويف', 'Beni Suef'], 'el_wasta' => ['الواسطى', 'El Wasta']]],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('governorates', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('name', 80);
            $table->string('name_en', 80)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('cities', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('governorate_id', 40);
            $table->string('name', 80);
            $table->string('name_en', 80)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('governorate_id')->references('id')->on('governorates')->cascadeOnDelete();
            $table->index(['governorate_id', 'sort_order']);
        });

        $now = now();
        $governorateOrder = 0;

        foreach (self::LOCATIONS as $governorateId => [$name, $nameEn, $cities]) {
            DB::table('governorates')->insert(['id' => $governorateId, 'name' => $name, 'name_en' => $nameEn, 'sort_order' => ++$governorateOrder, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);

            DB::table('cities')->insert(array_map(fn (string $cityId, array $city, int $position): array => [
                'id' => $cityId,
                'governorate_id' => $governorateId,
                'name' => $city[0],
                'name_en' => $city[1],
                'sort_order' => $position + 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ], array_keys($cities), $cities, array_keys(array_values($cities))));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cities');
        Schema::dropIfExists('governorates');
    }
};
