<?php

namespace Database\Seeders;

use App\Actions\Affiliates\SyncAffiliateStats;
use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Actions\Reviews\RefreshProductRating;
use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Enums\CommissionStatus;
use App\Enums\CouponType;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\ReviewStatus;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Models\Admin;
use App\Models\AdminRole;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\StorePaymentGateway;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Vendor;
use App\Notifications\AdminAlertNotification;
use App\Support\ActivityLogger;
use App\Support\Locations;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * A busy platform for trying the admin dashboard: many stores in different niches and ages
 * (some suspended, some new), vendors and staff, customers, orders in every status over the
 * last 60 days, online payments and refunds, coupons, affiliates and payouts, reviews,
 * support tickets and an admin team. Runs after the other demo seeders. Local use only.
 */
class DemoPlatformSeeder extends Seeder
{
    /** Password for every vendor, staff member and admin this seeder creates. */
    public const PASSWORD = 'Demo@2026makhzan';

    /**
     * name, slug, niche, owner, governorate, age in days, size (orders), extras.
     *
     * @var list<array{0: string, 1: string, 2: string, 3: string, 4: string, 5: int, 6: int, 7?: list<string>}>
     */
    private const STORES = [
        ['تك زون للإلكترونيات', 'tech-zone', 'electronics', 'كريم عادل', 'cairo', 170, 40, ['gateway', 'affiliates', 'staff']],
        ['بيوتي لاند', 'beauty-land', 'beauty', 'منى الشريف', 'giza', 150, 36, ['gateway', 'affiliates']],
        ['حلويات الشام', 'sham-sweets', 'food', 'أحمد الحلبي', 'alexandria', 140, 30, ['affiliates']],
        ['بيت الديكور', 'decor-house', 'home', 'نهى سامي', 'cairo', 120, 28, ['gateway', 'staff']],
        ['دنيا الأطفال', 'kids-world', 'kids', 'رانيا فؤاد', 'dakahlia', 110, 26, ['affiliates']],
        ['سبورت فيت', 'sport-fit', 'sports', 'عمر طارق', 'giza', 100, 24, ['gateway']],
        ['مكتبة المعرفة', 'maarefa-books', 'books', 'هاني منصور', 'cairo', 95, 18, []],
        ['جنتلمان', 'gentleman-wear', 'menswear', 'يوسف رأفت', 'alexandria', 90, 30, ['gateway', 'affiliates', 'staff']],
        ['موبايل ستور', 'mobile-store', 'electronics', 'إسلام حسن', 'qalyubia', 80, 22, ['gateway']],
        ['جلو سكين', 'glow-skin', 'beauty', 'دينا مجدي', 'cairo', 75, 20, ['affiliates']],
        ['مطبخ ماما', 'mama-kitchen', 'food', 'سعاد عبد الله', 'giza', 65, 16, []],
        ['هوم ستايل', 'home-style', 'home', 'ماجد إبراهيم', 'cairo', 60, 14, ['suspended']],
        ['بيبي كير', 'baby-care', 'kids', 'هبة جمال', 'alexandria', 50, 14, ['gateway']],
        ['جيم برو', 'gym-pro', 'sports', 'محمود صلاح', 'cairo', 42, 12, ['affiliates']],
        ['كتب وروايات', 'novels-corner', 'books', 'سلمى عمرو', 'dakahlia', 35, 9, []],
        ['ستايل مان', 'style-man', 'menswear', 'خالد ناصر', 'giza', 28, 10, ['suspended']],
        ['جادجت هب', 'gadget-hub', 'electronics', 'زياد شريف', 'cairo', 22, 9, ['gateway']],
        ['روز كوزمتكس', 'rose-cosmetics', 'beauty', 'ياسمين علي', 'qalyubia', 18, 8, ['affiliates']],
        ['فطاير ومخبوزات', 'bakery-house', 'food', 'حسام فتحي', 'alexandria', 14, 7, []],
        ['ركن الهدايا', 'gifts-corner', 'home', 'مروة حسين', 'cairo', 10, 5, ['unverified']],
        ['ليتل ستارز', 'little-stars', 'kids', 'شيماء رضا', 'giza', 7, 4, []],
        ['أوت دور', 'outdoor-gear', 'sports', 'باسم وليد', 'cairo', 5, 3, ['inactive']],
        ['قارئ', 'qare2-books', 'books', 'نادر سمير', 'cairo', 3, 1, ['unverified']],
        ['تيك أواي جادجتس', 'takeaway-gadgets', 'electronics', 'أيمن رشاد', 'giza', 1, 0, []],
        ['متجر قيد الإيقاف', 'blocked-shop', 'menswear', 'سامح عزت', 'cairo', 45, 6, ['suspended', 'inactive']],
    ];

    /**
     * Categories per niche, each with products: name, price, options.
     *
     * @var array<string, array<string, list<array{0: string, 1: int, 2?: array<string, list<string>>}>>>
     */
    private const CATALOGS = [
        'electronics' => [
            'موبايلات' => [['سامسونج جالاكسي A55', 17999, ['السعة' => ['128GB', '256GB']]], ['شاومي ريدمي نوت 13', 9999, ['اللون' => ['أسود', 'أزرق']]], ['آيفون 15', 52000, ['السعة' => ['128GB', '256GB']]]],
            'سماعات' => [['سماعة بلوتوث لاسلكية', 1250, ['اللون' => ['أبيض', 'أسود']]], ['سماعة جيمنج', 1850], ['إيربودز برو', 8900]],
            'إكسسوارات موبايل' => [['شاحن سريع 65 وات', 650], ['باور بانك 20000', 980], ['جراب سيليكون', 180, ['اللون' => ['شفاف', 'أسود', 'كحلي']]], ['كابل تايب سي', 150]],
        ],
        'beauty' => [
            'العناية بالبشرة' => [['سيروم فيتامين سي', 420], ['غسول للبشرة الدهنية', 260], ['كريم مرطب ليلي', 380], ['واقي شمس SPF50', 450]],
            'مكياج' => [['أحمر شفاه مطفي', 220, ['اللون' => ['نود', 'أحمر', 'وردي']]], ['كريم أساس', 540, ['الدرجة' => ['فاتح', 'متوسط', 'قمحي']]], ['ماسكارا', 280]],
            'العناية بالشعر' => [['زيت الأرجان', 310], ['شامبو بدون سلفات', 240], ['ماسك الكيراتين', 360]],
        ],
        'food' => [
            'حلويات شرقية' => [['كنافة بالقشطة', 280, ['الحجم' => ['نص كيلو', 'كيلو']]], ['بسبوسة بالبندق', 220, ['الحجم' => ['نص كيلو', 'كيلو']]], ['بقلاوة مشكلة', 450]],
            'معجنات' => [['فطير مشلتت', 150], ['كرواسون زبدة (6 قطع)', 120], ['بيتزا مجمدة', 190]],
            'مخبوزات صحية' => [['خبز شوفان', 60], ['كوكيز بدون سكر', 95]],
        ],
        'home' => [
            'ديكور' => [['مرآة حائط دائرية', 950], ['فازة سيراميك', 380, ['اللون' => ['أبيض', 'بيج']]], ['لوحة كانفاس', 650]],
            'مفروشات' => [['طقم ملايات قطن', 1200, ['المقاس' => ['سرير فردي', 'سرير مزدوج']]], ['خدادية مطرزة', 180], ['سجادة صالون', 2400]],
            'أدوات مطبخ' => [['طقم حلل جرانيت', 3200], ['طقم سكاكين', 650], ['مج قهوة', 90, ['اللون' => ['أسود', 'أبيض', 'أخضر']]]],
        ],
        'kids' => [
            'ملابس أطفال' => [['بيجامة قطن أطفال', 320, ['السن' => ['2 سنة', '4 سنين', '6 سنين']]], ['فستان بناتي', 450, ['السن' => ['3 سنين', '5 سنين']]]],
            'ألعاب' => [['مكعبات تركيب', 380], ['عروسة بالملابس', 290], ['عربية ريموت', 650]],
            'مستلزمات بيبي' => [['حفاضات مقاس 3', 420], ['ببرونة مضادة للمغص', 180], ['كرسي سيارة', 3800]],
        ],
        'sports' => [
            'ملابس رياضية' => [['تيشرت دراي فيت', 350, ['المقاس' => ['M', 'L', 'XL']]], ['ليجن رياضي', 420, ['المقاس' => ['S', 'M', 'L']]]],
            'معدات جيم' => [['دمبل 5 كيلو (زوج)', 900], ['حبل نط', 120], ['مات يوجا', 380, ['اللون' => ['بنفسجي', 'أزرق']]]],
            'مكملات' => [['واي بروتين 2 كيلو', 3600, ['النكهة' => ['شوكولاتة', 'فانيليا']]], ['كرياتين', 950]],
        ],
        'books' => [
            'روايات' => [['رواية أرض زيكولا', 180], ['رواية الفيل الأزرق', 210], ['ثلاثية غرناطة', 260]],
            'تنمية بشرية' => [['العادات الذرية', 230], ['فن اللامبالاة', 190]],
            'كتب أطفال' => [['قصص قبل النوم', 120], ['كتاب تلوين', 75]],
        ],
        'menswear' => [
            'قمصان' => [['قميص أكسفورد', 650, ['المقاس' => ['M', 'L', 'XL', 'XXL']]], ['قميص كتان', 590, ['اللون' => ['أبيض', 'بيج'], 'المقاس' => ['L', 'XL']]]],
            'بناطيل' => [['بنطلون جينز سليم', 780, ['المقاس' => ['30', '32', '34', '36']]], ['بنطلون شينو', 690, ['المقاس' => ['32', '34']]]],
            'أحذية' => [['حذاء جلد كلاسيك', 1650, ['المقاس' => ['41', '42', '43', '44']]], ['سنيكرز أبيض', 1200, ['المقاس' => ['41', '42', '43']]]],
        ],
    ];

    /** Final statuses for orders older than a few days, weighted towards delivered. */
    private const OUTCOMES = ['delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'confirmed', 'pending', 'cancelled', 'cancelled', 'returned'];

    private const PATHS = [
        'pending' => [],
        'confirmed' => ['confirmed'],
        'shipped' => ['confirmed', 'shipped'],
        'delivered' => ['confirmed', 'shipped', 'delivered'],
        'cancelled' => ['cancelled'],
        'returned' => ['confirmed', 'shipped', 'delivered', 'returned'],
    ];

    /** Hours after placing an order that each status change happens. */
    private const STATUS_DELAYS = ['confirmed_at' => 3, 'shipped_at' => 26, 'delivered_at' => 70, 'cancelled_at' => 6, 'returned_at' => 150];

    /** @var list<array{0: int, 1: string|null}> */
    private const REVIEWS = [
        [5, 'منتج ممتاز والتوصيل كان في معاده.'],
        [5, 'جودة عالية جداً، أنصح بالتعامل معهم.'],
        [4, 'كويس جداً بس التغليف محتاج يتحسن.'],
        [4, 'المنتج زي الصور بالظبط.'],
        [3, 'متوسط، السعر شوية عالي بالنسبة للجودة.'],
        [2, 'اتأخر في التوصيل أسبوع كامل.'],
        [1, 'المنتج وصل فيه عيب ومحدش رد عليا.'],
        [5, null],
        [4, null],
    ];

    /** @var list<array{0: string, 1: SupportTicketType, 2: list<string>}> */
    private const TICKETS = [
        ['مش قادر أربط بوابة الدفع', SupportTicketType::Problem, ['جربت أضيف بيانات Paymob وبيطلعلي خطأ في التحقق.', 'تأكد من إن الـ HMAC صحيح ومن وضع الـ Live، وجرب تاني.', 'تمام اشتغلت، شكراً جداً.']],
        ['الطلبات مش بتوصلني إيميلات', SupportTicketType::Problem, ['من امبارح مفيش إشعارات بتوصلني عن الطلبات الجديدة.']],
        ['اقتراح: تقارير أسبوعية على الإيميل', SupportTicketType::Suggestion, ['ياريت يكون في تقرير أسبوعي بالمبيعات يتبعت أوتوماتيك.', 'فكرة حلوة، ضفناها لخطة التطوير.']],
        ['الدومين الخاص مش شغال', SupportTicketType::Problem, ['ضفت الـ CNAME من يومين والدومين لسه مش بيفتح.', 'التفعيل ممكن ياخد لحد 48 ساعة، هنتابع معاك.', 'لسه مش شغال للأسف.']],
        ['عايز أغير اسم المتجر', SupportTicketType::Problem, ['ازاي أغير اسم المتجر والرابط؟', 'تقدر تغير الاسم من الإعدادات، الرابط ثابت حفاظاً على الروابط القديمة.']],
        ['اقتراح: دعم الفاتورة الإلكترونية', SupportTicketType::Suggestion, ['محتاجين ربط مع منظومة الفاتورة الإلكترونية.']],
        ['مشكلة في رفع الصور', SupportTicketType::Problem, ['الصور الكبيرة مش بترفع.', 'الحد الأقصى 5 ميجا للصورة، جرب تضغطها.']],
        ['المسوقين مش شايفين العمولات', SupportTicketType::Problem, ['المسوقين بيقولوا الرصيد صفر رغم إن في طلبات اتسلمت.']],
        ['اقتراح: تطبيق موبايل للتاجر', SupportTicketType::Suggestion, ['هل في نية لعمل تطبيق للتاجر؟', 'أيوه شغالين عليه وهيكون متاح قريب.']],
        ['تعليق المتجر', SupportTicketType::Problem, ['المتجر اتعلق ليه؟ محتاج أعرف السبب.', 'تم تعليق المتجر بسبب شكاوى متكررة من العملاء، برجاء التواصل مع فريق المراجعة.']],
        ['خطأ في حساب الشحن', SupportTicketType::Problem, ['الشحن بيتحسب غلط للإسكندرية.']],
        ['اقتراح: كوبونات للعملاء الجدد بس', SupportTicketType::Suggestion, ['ياريت أقدر أعمل كوبون يشتغل على أول طلب بس.', 'الميزة دي موجودة فعلاً، فعّل خيار "أول طلب فقط" في الكوبون.', 'تمام لقيتها شكراً.']],
    ];

    /** @var array<string, Admin> */
    private array $admins = [];

    public function __construct(
        private PlaceOrder $placeOrder,
        private UpdateOrderStatus $updateStatus,
        private SyncAffiliateStats $syncStats,
        private RefreshProductRating $refreshRating,
    ) {}

    public function run(): void
    {
        // Demo data shouldn't fill anyone's bell or the mail queue.
        Notification::fake();

        $this->seedAdminTeam();

        $stores = collect(self::STORES)
            ->reject(fn (array $details): bool => Store::query()->where('slug', $details[1])->exists())
            ->map(fn (array $details): Store => $this->seedStore($details));

        $this->seedSupportTickets($stores->values());
    }

    private function seedAdminTeam(): void
    {
        $roles = [
            'support' => ['دعم فني', 'يرد على تذاكر الدعم ويتابع المتاجر', ['overview.view', 'stores.view', 'vendors.view', 'orders.view', 'tickets.view', 'tickets.reply']],
            'finance' => ['مراجع مالي', 'يتابع المدفوعات والتحويلات', ['overview.view', 'orders.view', 'payments.view', 'coupons.view', 'affiliates.view']],
            'moderation' => ['مراجعة المحتوى', 'يراجع المنتجات والتقييمات ويعلّق المتاجر المخالفة', ['overview.view', 'stores.view', 'stores.suspend', 'products.view', 'reviews.view', 'reviews.update', 'logs.view']],
        ];

        $members = [
            'support' => ['ليلى حسن', 'support@makhzan.app', true],
            'finance' => ['طارق السيد', 'finance@makhzan.app', true],
            'moderation' => ['نورهان عادل', 'moderation@makhzan.app', true],
            'former' => ['شريف كمال', 'former@makhzan.app', false],
        ];

        foreach ($roles as $key => [$name, $description, $permissions]) {
            $role = AdminRole::query()->firstOrCreate(['name' => $name], ['description' => $description, 'permissions' => $permissions]);
            [$fullName, $email, $isActive] = $members[$key];
            $this->admins[$key] = Admin::query()->firstOrCreate(['email' => $email], ['full_name' => $fullName, 'password' => self::PASSWORD, 'is_super' => false, 'role_id' => $role->id, 'is_active' => $isActive]);
        }

        [$fullName, $email] = $members['former'];
        Admin::query()->firstOrCreate(['email' => $email], ['full_name' => $fullName, 'password' => self::PASSWORD, 'is_super' => false, 'role_id' => $this->admins['support']->role_id, 'is_active' => false]);
    }

    /**
     * @param  array{0: string, 1: string, 2: string, 3: string, 4: string, 5: int, 6: int, 7?: list<string>}  $details
     */
    private function seedStore(array $details): Store
    {
        [$name, $slug, $niche, $owner, $governorateId, $ageInDays, $orderCount] = $details;
        $extras = $details[7] ?? [];
        $createdAt = now()->subDays($ageInDays)->setTime(fake()->numberBetween(9, 22), fake()->numberBetween(0, 59));

        $vendor = Vendor::factory()->create([
            'full_name' => $owner,
            'email' => "{$slug}@example.com",
            'password' => self::PASSWORD,
            'email_verified_at' => in_array('unverified', $extras, true) ? null : $createdAt,
            'is_active' => ! in_array('inactive', $extras, true),
            'last_login_at' => now()->subHours(fake()->numberBetween(1, 24 * min($ageInDays + 1, 20))),
            'created_at' => $createdAt,
        ]);

        $store = Store::factory()->for($vendor)->create([
            'name' => $name,
            'slug' => $slug,
            'governorate_id' => $governorateId,
            'city_id' => Arr::random(Locations::activeCityIds($governorateId)),
            'description' => "{$name} — أفضل المنتجات بأفضل الأسعار مع توصيل لكل المحافظات.",
            'contact_phone' => $vendor->phone,
            'whatsapp' => $vendor->phone,
            'created_at' => $createdAt,
        ]);
        $this->alertTeam(AdminAlertNotification::STORE_REGISTERED, ['store_id' => $store->id, 'store_name' => $store->name, 'owner_name' => $vendor->full_name], $createdAt);
        $store->forceFill(['default_shipping_price' => fake()->randomElement([40, 50, 60, 70]), 'free_shipping_threshold' => fake()->randomElement([null, 1500, 2500])])->save();
        $store->shippingRates()->updateOrCreate(['governorate_id' => $governorateId], ['price' => 35, 'is_enabled' => true]);

        if (in_array('gateway', $extras, true)) {
            StorePaymentGateway::factory()->create(['store_id' => $store->id]);
        }

        if (in_array('staff', $extras, true)) {
            $this->seedStaff($store);
        }

        $this->seedCatalog($store, $niche);
        $coupon = $this->seedCoupons($store);
        $affiliates = in_array('affiliates', $extras, true) ? $this->seedAffiliates($store) : collect();

        $this->seedOrders($store->fresh(), $orderCount, $createdAt, $affiliates, $coupon);
        $this->seedReviews($store);

        $affiliates->each(function (Affiliate $affiliate): void {
            $this->seedPayouts($affiliate);
            $this->syncStats->handle($affiliate->fresh());
        });

        if (in_array('suspended', $extras, true)) {
            $this->suspend($store);
        }

        return $store;
    }

    private function seedStaff(Store $store): void
    {
        $role = $store->roles()->firstOrCreate(['name' => 'خدمة العملاء'], [
            'description' => 'يتابع الطلبات والعملاء',
            'permissions' => ['orders.view', 'orders.update', 'customers.view'],
        ]);

        $arabic = fake('ar_EG');

        foreach (range(1, fake()->numberBetween(1, 3)) as $index) {
            $store->staff()->create([
                'full_name' => $arabic->firstName().' '.$arabic->lastName(),
                'job_title' => fake()->randomElement(['خدمة عملاء', 'مسؤول مخزن', 'مسؤول شحن']),
                'phone' => '011'.fake()->unique()->numerify('########'),
                'email' => "staff{$index}.{$store->slug}@example.com",
                'password' => self::PASSWORD,
                'role_id' => $role->id,
            ]);
        }
    }

    private function seedCatalog(Store $store, string $niche): void
    {
        $position = 0;
        $prefix = strtoupper(substr(str_replace('-', '', $store->slug), 0, 3));

        foreach (self::CATALOGS[$niche] as $categoryName => $products) {
            $category = $store->productCategories()->create([
                'name' => $categoryName,
                'slug' => ProductCategory::uniqueSlug($store->id, $categoryName),
                'position' => $position++,
            ]);

            foreach ($products as $product) {
                $this->seedProduct($store, $category->id, $prefix, $product[0], $product[1], $product[2] ?? []);
            }
        }
    }

    /**
     * @param  array<string, list<string>>  $options
     */
    private function seedProduct(Store $store, int $categoryId, string $prefix, string $name, int $price, array $options): void
    {
        $product = $store->products()->create([
            'category_id' => $categoryId,
            'name' => $name,
            'slug' => Product::uniqueSlug($store->id, $name),
            'description' => "{$name} من {$store->name}، منتج أصلي بضمان الاستبدال خلال 14 يوم.",
            'status' => fake()->randomElement([...array_fill(0, 8, ProductStatus::Active), ProductStatus::Draft, ProductStatus::Archived]),
            'is_featured' => fake()->boolean(25),
            'options' => collect($options)->map(fn (array $values, string $optionName): array => ['name' => $optionName, 'values' => $values])->values()->all(),
        ]);

        $combinations = Arr::crossJoin(...array_values($options)) ?: [[]];
        $hasDiscount = fake()->boolean(30);

        foreach ($combinations as $index => $values) {
            $product->variants()->create([
                'option_values' => $values,
                'sku' => "{$prefix}-{$product->id}-".($index + 1),
                'price' => $price,
                'compare_at_price' => $hasDiscount ? round($price * 1.2, -1) : null,
                'stock' => fake()->randomElement([0, 3, 15, 25, 40, 40, 60, 90]),
                'position' => $index,
            ]);
        }
    }

    /**
     * An active welcome coupon used on some orders, plus expired, inactive and other kinds.
     */
    private function seedCoupons(Store $store): Coupon
    {
        $code = strtoupper(substr(str_replace('-', '', $store->slug), 0, 4));

        $welcome = $store->coupons()->create(['code' => "{$code}10", 'description' => 'خصم 10% على كل المنتجات', 'type' => CouponType::Percentage, 'value' => 10, 'applies_to' => Coupon::APPLIES_TO_ALL, 'is_active' => true]);

        $store->coupons()->create(['code' => "{$code}100", 'description' => 'خصم 100 جنيه للطلبات فوق 1000', 'type' => CouponType::Fixed, 'value' => 100, 'min_subtotal' => 1000, 'applies_to' => Coupon::APPLIES_TO_ALL, 'is_active' => true, 'usage_limit' => 50]);
        $store->coupons()->create(['code' => "{$code}SHIP", 'description' => 'شحن مجاني', 'type' => CouponType::FreeShipping, 'value' => 0, 'applies_to' => Coupon::APPLIES_TO_ALL, 'is_active' => fake()->boolean(70)]);
        $store->coupons()->create(['code' => "{$code}EID", 'description' => 'عرض العيد', 'type' => CouponType::Percentage, 'value' => 20, 'max_discount' => 300, 'applies_to' => Coupon::APPLIES_TO_ALL, 'is_active' => true, 'starts_at' => now()->subDays(60), 'ends_at' => now()->subDays(20)]);

        return $welcome;
    }

    /**
     * @return Collection<int, Affiliate>
     */
    private function seedAffiliates(Store $store): Collection
    {
        $arabic = fake('ar_EG');
        $affiliates = Affiliate::factory()->for($store->vendor)->for($store)->state(function () use ($arabic): array {
            $name = $arabic->firstName().' '.$arabic->lastName();

            return ['full_name' => $name, 'payout_account_name' => $name];
        });

        $affiliates->count(fake()->numberBetween(3, 6))->create();
        $affiliates->tier(AffiliateTier::Vip)->bankPayout()->create();
        $affiliates->frozen()->create();
        $affiliates->pending()->tier(AffiliateTier::New)->create();

        return $store->affiliates()->where('status', AffiliateStatus::Active)->with('referralCodes')->get();
    }

    /**
     * @param  Collection<int, Affiliate>  $affiliates
     */
    private function seedOrders(Store $store, int $count, Carbon $storeCreatedAt, Collection $affiliates, Coupon $coupon): void
    {
        if ($count === 0) {
            return;
        }

        $arabic = fake('ar_EG');
        $customers = Customer::factory()->count(max(3, (int) ceil($count * 0.6)))->for($store)->state(fn (): array => [
            'full_name' => $arabic->firstName().' '.$arabic->lastName(),
            'created_at' => Carbon::instance(fake()->dateTimeBetween($storeCreatedAt, 'now')),
        ])->create();

        $governorates = Locations::active();
        $hasGateway = $store->paymentGateway()->exists();
        $earliest = max($storeCreatedAt->timestamp, now()->subDays(60)->timestamp);
        $placedTimes = collect(range(1, $count))->map(fn (): int => fake()->numberBetween($earliest, now()->subMinutes(30)->timestamp))->sort()->values();

        foreach ($placedTimes as $timestamp) {
            $placedAt = Carbon::createFromTimestamp($timestamp);
            $customer = $customers->random();
            $governorateId = fake()->randomElement(['cairo', 'cairo', 'cairo', 'giza', 'giza', 'alexandria', 'qalyubia', 'dakahlia', ...array_keys($governorates)]);
            $affiliate = $affiliates->isNotEmpty() && fake()->boolean(35) ? $affiliates->random() : null;

            $variants = ProductVariant::query()
                ->where('stock', '>', 2)
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
                ->inRandomOrder()
                ->limit(fake()->numberBetween(1, 3))
                ->get();

            if ($variants->isEmpty()) {
                break;
            }

            try {
                $order = $this->placeOrder->handle(
                    $store,
                    $customer,
                    $variants->map(fn (ProductVariant $variant): array => ['variant_id' => $variant->id, 'quantity' => fake()->numberBetween(1, 2)])->all(),
                    [
                        'recipient_name' => $customer->full_name,
                        'phone' => $customer->phone,
                        'governorate_id' => $governorateId,
                        'city_id' => fake()->randomElement($governorates[$governorateId]),
                        'address_line' => fake()->numberBetween(1, 90).' '.$arabic->streetName(),
                    ],
                    $affiliate?->referralCodes->first()?->code,
                    fake()->boolean(15) ? 'برجاء الاتصال قبل التوصيل' : null,
                    fake()->boolean(15) ? $coupon->code : null,
                );
            } catch (ValidationException) {
                continue;
            }

            $ageInHours = $placedAt->diffInHours(now());
            $outcome = match (true) {
                $ageInHours < 6 => 'pending',
                $ageInHours < 30 => fake()->randomElement(['pending', 'confirmed', 'confirmed', 'cancelled']),
                $ageInHours < 80 => fake()->randomElement(['confirmed', 'shipped', 'shipped', 'delivered', 'cancelled']),
                default => fake()->randomElement(self::OUTCOMES),
            };

            foreach (self::PATHS[$outcome] as $status) {
                $this->updateStatus->handle($order, OrderStatus::from($status), OrderEvent::ACTOR_VENDOR);
            }

            $this->backdate($order->fresh(), $placedAt);

            if ($hasGateway && fake()->boolean(40)) {
                $this->payOnline($order->fresh(), $placedAt);
            }
        }
    }

    private function backdate(Order $order, Carbon $placedAt): void
    {
        $timestamps = ['created_at' => $placedAt, 'updated_at' => $placedAt];

        foreach (self::STATUS_DELAYS as $column => $hours) {
            if ($order->{$column} !== null) {
                $timestamps[$column] = $placedAt->copy()->addHours($hours)->min(now());
                $timestamps['updated_at'] = $timestamps[$column];
            }
        }

        if (fake()->boolean(25)) {
            $timestamps['source'] = fake()->randomElement(OrderSource::manual());
        }

        $order->forceFill($timestamps)->saveQuietly();
        $order->events()->update(['created_at' => $placedAt]);
    }

    /**
     * Turns a placed order into one paid by card or wallet, failed when it was cancelled and
     * refunded when it came back.
     */
    private function payOnline(Order $order, Carbon $placedAt): void
    {
        $method = fake()->randomElement([PaymentMethod::Card, PaymentMethod::Card, PaymentMethod::Wallet]);
        $paidAt = $placedAt->copy()->addMinutes(fake()->numberBetween(1, 15));
        $status = match ($order->status) {
            OrderStatus::Cancelled => PaymentStatus::Failed,
            OrderStatus::Returned => PaymentStatus::Refunded,
            default => PaymentStatus::Paid,
        };

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'store_id' => $order->store_id,
            'method' => $method,
            'status' => $status,
            'amount' => $order->total,
            'refunded_amount' => $status === PaymentStatus::Refunded ? $order->total : 0,
            'gateway_transaction_id' => $status === PaymentStatus::Failed ? null : (string) fake()->unique()->numberBetween(100000000, 999999999),
            'failure_reason' => $status === PaymentStatus::Failed ? 'Insufficient funds' : null,
            'paid_at' => $status === PaymentStatus::Failed ? null : $paidAt,
            'created_at' => $placedAt,
            'updated_at' => $paidAt,
        ]);

        if ($status === PaymentStatus::Refunded) {
            $payment->refunds()->create(['order_id' => $order->id, 'amount' => $order->total, 'reason' => 'مرتجع من العميل', 'gateway_reference' => (string) fake()->numberBetween(100000000, 999999999), 'actor' => OrderEvent::ACTOR_VENDOR]);
        }

        $order->forceFill([
            'payment_method' => $method,
            'payment_status' => $status,
            'paid_at' => $payment->paid_at,
            'refunded_amount' => $payment->refunded_amount,
        ])->saveQuietly();
    }

    private function seedReviews(Store $store): void
    {
        $store->orders()->where('status', OrderStatus::Delivered)->with(['items', 'customer'])->inRandomOrder()->limit(fake()->numberBetween(2, 10))->get()
            ->each(function (Order $order): void {
                $product = Product::query()->find($order->items->first()?->product_id);

                if (! $product || $product->reviews()->where('customer_id', $order->customer_id)->exists()) {
                    return;
                }

                [$rating, $body] = Arr::random(self::REVIEWS);
                $status = $rating <= 1 ? fake()->randomElement([ReviewStatus::Pending, ReviewStatus::Rejected]) : fake()->randomElement([ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Pending]);

                $review = $product->reviews()->make([
                    'customer_id' => $order->customer_id,
                    'order_id' => $order->id,
                    'customer_name' => $order->customer->full_name,
                    'rating' => $rating,
                    'body' => $body,
                    'status' => $status,
                ]);
                $review->store()->associate($order->store_id);
                $review->save();
            });

        $store->products()->whereHas('reviews')->get()->each(fn (Product $product) => $this->refreshRating->handle($product));
    }

    /**
     * A paid transfer of part of what the affiliate earned, and sometimes an open or declined
     * request, so balances stay positive.
     */
    private function seedPayouts(Affiliate $affiliate): void
    {
        $earned = (float) $affiliate->orders()->where('commission_status', CommissionStatus::Earned)->sum('commission_amount');
        $amount = floor($earned * fake()->randomFloat(2, 0.3, 0.6));

        if ($amount < 1) {
            return;
        }

        $payout = AffiliatePayout::factory()->for($affiliate)->state([
            'store_id' => $affiliate->store_id,
            'payout_type' => $affiliate->payout_type,
            'payout_account_name' => $affiliate->payout_account_name,
            'payout_account_last4' => mb_substr((string) $affiliate->payout_account_number, -4),
            'amount' => $amount,
        ]);

        $payout->create();

        if (fake()->boolean(50)) {
            fake()->boolean(70) ? $payout->requested()->create() : $payout->rejected()->create();
        }
    }

    private function suspend(Store $store): void
    {
        $reason = fake()->randomElement(['شكاوى متكررة من العملاء بعدم التوصيل', 'بيع منتجات مقلدة', 'مخالفة شروط الاستخدام']);

        ActivityLogger::withoutLogging(fn () => $store->forceFill(['suspended_at' => now()->subDays(fake()->numberBetween(1, 10)), 'suspension_reason' => $reason])->save());
        ActivityLogger::log('store.suspended', $store, ['reason' => $reason], actor: $this->admins['moderation']);
    }

    /**
     * @param  Collection<int, Store>  $stores
     */
    private function seedSupportTickets(Collection $stores): void
    {
        if ($stores->isEmpty()) {
            return;
        }

        foreach (self::TICKETS as $index => [$subject, $type, $messages]) {
            $store = $stores[$index % $stores->count()];
            $openedAt = now()->subDays(fake()->numberBetween(1, 25))->subHours(fake()->numberBetween(0, 12));
            $closed = count($messages) >= 3 || ($type === SupportTicketType::Suggestion && count($messages) === 2);

            $ticket = SupportTicket::factory()->create([
                'store_id' => $store->id,
                'vendor_id' => $store->vendor_id,
                'subject' => $subject,
                'type' => $type,
                'status' => $closed ? SupportTicketStatus::Closed : SupportTicketStatus::Open,
                'last_reply_by' => count($messages) % 2 === 0 ? SupportTicket::AUTHOR_ADMIN : SupportTicket::AUTHOR_VENDOR,
                'last_activity_at' => $openedAt->copy()->addHours(count($messages) * 5),
                'closed_at' => $closed ? $openedAt->copy()->addHours(count($messages) * 5 + 1) : null,
                'created_at' => $openedAt,
            ]);

            foreach ($messages as $position => $body) {
                if ($position % 2 === 0) {
                    $details = ['store_id' => $store->id, 'store_name' => $store->name, 'ticket_id' => $ticket->id, 'subject' => $subject];
                    $position === 0
                        ? $this->alertTeam(AdminAlertNotification::TICKET_OPENED, [...$details, 'type' => $type->value], $openedAt)
                        : $this->alertTeam(AdminAlertNotification::TICKET_VENDOR_REPLIED, $details, $openedAt->copy()->addHours($position * 5));
                }

                $message = SupportTicketMessage::factory()->for($ticket, 'ticket')->state(['body' => $body, 'created_at' => $openedAt->copy()->addHours($position * 5)]);
                $position % 2 === 0 ? $message->create() : $message->fromAdmin($this->admins['support'])->create();
            }
        }
    }

    /**
     * What Admin::notifyTeam() sends (the bell is silenced while seeding), dated when it
     * happened; alerts older than three days are already read.
     *
     * @param  array<string, mixed>  $details
     */
    private function alertTeam(string $event, array $details, Carbon $at): void
    {
        $permission = AdminAlertNotification::PERMISSIONS[$event];

        Admin::query()->with('role')->where('is_active', true)->get()
            ->filter(fn (Admin $admin): bool => $admin->hasPermission($permission))
            ->each(fn (Admin $admin) => $admin->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => $event,
                'data' => $details,
                'read_at' => $at->lt(now()->subDays(3)) ? $at->copy()->addHours(2) : null,
                'created_at' => $at,
                'updated_at' => $at,
            ]));
    }
}
