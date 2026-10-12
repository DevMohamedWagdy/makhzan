import { APP_DOMAIN } from '@/lib/constants';

/** Demo vendor account. Credentials are mock-only and exist solely in this file. */
export const DEMO_CREDENTIALS = {
    identifier: 'vendor@makhzan.app',
    password: 'Makhzan@2026',
};

/** @type {import('@/lib/schema').Vendor} */
export const MOCK_VENDOR = {
    vendor_id: 1024,
    full_name: 'محمد وجدي',
    phone: '01001234567',
    email: DEMO_CREDENTIALS.identifier,
    created_at: '2026-03-14T10:20:00Z',
    store: {
        store_id: 3051,
        vendor_id: 1024,
        name: 'نور للأزياء',
        slug: 'noor-fashion',
        logo_url: null,
        governorate_id: 'cairo',
        city_id: 'nasr_city',
    },
};

export const TAKEN_SLUGS = ['noor-fashion', 'elsafa-store', 'tech-zone', 'beauty-box'];

const FIRST_NAMES = ['أحمد', 'محمود', 'سارة', 'منى', 'يوسف', 'مريم', 'عمر', 'نورهان', 'خالد', 'هبة', 'كريم', 'آية', 'مصطفى', 'دينا', 'إسلام', 'رنا', 'طارق', 'ياسمين', 'حسام', 'شيماء'];
const LAST_NAMES = ['عبد الرحمن', 'السيد', 'إبراهيم', 'حسن', 'فتحي', 'منصور', 'الشريف', 'عادل', 'سليمان', 'نبيل', 'رمضان', 'جمال'];
const LATIN_NAMES = ['ahmed', 'mahmoud', 'sara', 'mona', 'youssef', 'mariam', 'omar', 'nourhan', 'khaled', 'heba', 'karim', 'aya', 'mostafa', 'dina', 'eslam', 'rana', 'tarek', 'yasmin', 'hossam', 'shaimaa'];
const BANKS = ['البنك الأهلي المصري', 'بنك مصر', 'CIB', 'بنك القاهرة'];

/** Deterministic PRNG so mock data is identical on every reload. */
function seeded(seed) {
    let state = seed;

    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;

        return state / 4294967296;
    };
}

const random = seeded(20261012);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => Math.floor(random() * (max - min + 1)) + min;

function daysAgo(days) {
    return new Date(Date.now() - days * 86400000 - between(0, 86400000)).toISOString();
}

export function buildReferralUrl(code, storeSlug = MOCK_VENDOR.store.slug) {
    return `https://${APP_DOMAIN}/${storeSlug}?ref=${code}`;
}

export function buildRegistrationLink(store, token) {
    return {
        store_id: store.store_id,
        token,
        url: `https://${APP_DOMAIN}/${store.slug}/affiliates/join?t=${token}`,
        is_enabled: true,
        auto_approve: false,
        default_tier: 'new',
    };
}

function buildAffiliate(index) {
    const affiliate_id = 5001 + index;
    const firstIndex = index % FIRST_NAMES.length;
    const full_name = `${FIRST_NAMES[firstIndex]} ${pick(LAST_NAMES)}`;
    const tier = index % 7 === 0 ? 'vip' : index % 3 === 0 ? 'new' : 'general';
    const status = index % 11 === 4 ? 'frozen' : index % 13 === 6 || index === 1 ? 'pending' : 'active';
    const payoutType = pick(['vodafone_cash', 'vodafone_cash', 'instapay', 'bank_account', 'orange_cash', 'we_cash', 'etisalat_cash']);
    const phone = `01${pick(['0', '1', '2', '5'])}${String(between(10000000, 99999999))}`;
    const ordersCount = status === 'pending' ? 0 : between(tier === 'vip' ? 80 : 3, tier === 'vip' ? 420 : 140);
    const salesTotal = ordersCount * between(280, 950);
    const rate = { new: 5, general: 8, vip: 12 }[tier];
    const code = `${LATIN_NAMES[firstIndex].toUpperCase()}${between(10, 99)}`;

    return {
        affiliate_id,
        vendor_id: MOCK_VENDOR.vendor_id,
        store_id: MOCK_VENDOR.store.store_id,
        full_name,
        phone,
        email: index % 4 === 3 ? null : `${LATIN_NAMES[firstIndex]}.${affiliate_id}@gmail.com`,
        avatar_url: null,
        status,
        tier,
        payout_method: {
            type: payoutType,
            account_name: full_name,
            account_number:
                payoutType === 'bank_account'
                    ? String(between(1000000000, 9999999999)) + String(between(100000, 999999))
                    : payoutType === 'instapay'
                      ? `${LATIN_NAMES[firstIndex]}${affiliate_id}@instapay`
                      : phone,
            bank_name: payoutType === 'bank_account' ? pick(BANKS) : null,
            iban: payoutType === 'bank_account' ? `EG38000300030000${between(1000000000, 9999999999)}${between(100, 999)}` : null,
        },
        commission_override: index % 9 === 2 ? { type: 'percentage', value: rate + 3, note: 'اتفاق خاص لموسم الصيف' } : null,
        referral_codes:
            status === 'pending'
                ? []
                : [
                      {
                          referral_code_id: affiliate_id * 10 + 1,
                          code,
                          url: buildReferralUrl(code),
                          clicks: between(ordersCount * 4, ordersCount * 12 + 20),
                          orders: ordersCount,
                          is_active: status === 'active',
                          created_at: daysAgo(between(20, 200)),
                      },
                  ],
        stats: {
            orders_count: ordersCount,
            sales_total: salesTotal,
            earned_commission: Math.round((salesTotal * rate) / 100),
            pending_balance: status === 'active' ? between(0, 2400) : 0,
        },
        payout_request: null,
        source: status === 'pending' ? 'self_registration' : pick(['manual', 'manual', 'self_registration', 'bulk_import']),
        frozen_reason: status === 'frozen' ? 'مخالفة سياسة الإعلانات الممولة' : null,
        joined_at: daysAgo(status === 'pending' ? between(0, 4) : between(10, 220)),
        last_active_at: status === 'pending' ? null : daysAgo(between(0, 30)),
    };
}

/** @type {import('@/lib/schema').Affiliate[]} */
export const MOCK_AFFILIATES = Array.from({ length: 38 }, (_, index) => buildAffiliate(index));

/** Demo affiliate login (mock only): the first active mock affiliate. */
export const DEMO_AFFILIATE_CREDENTIALS = {
    affiliate_id: MOCK_AFFILIATES.find((affiliate) => affiliate.status === 'active').affiliate_id,
    phone: MOCK_AFFILIATES.find((affiliate) => affiliate.status === 'active').phone,
    password: 'Affiliate@2026',
};

/** @type {import('@/lib/schema').RegistrationLinkSettings} */
export const MOCK_REGISTRATION_LINK = buildRegistrationLink(MOCK_VENDOR.store, 'j7Kq2xP9');
