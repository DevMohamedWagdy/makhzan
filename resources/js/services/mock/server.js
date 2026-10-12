import { AFFILIATE_TIERS, RESERVED_SLUGS } from '@/lib/constants';
import { normalizePhone } from '@/lib/validators';
import { sessionStore } from '../session';
import { DEMO_AFFILIATE_CREDENTIALS, DEMO_CREDENTIALS, MOCK_AFFILIATES, MOCK_REGISTRATION_LINK, MOCK_VENDOR, TAKEN_SLUGS, buildReferralUrl, buildRegistrationLink } from './data';

/**
 * In-memory mock of the Makhzan REST API. Handlers receive the same payloads the
 * real Laravel endpoints will, so swapping to the backend is a config change only.
 */
const db = {
    vendors: [structuredClone(MOCK_VENDOR)],
    credentials: [{ vendor_id: MOCK_VENDOR.vendor_id, ...DEMO_CREDENTIALS }],
    affiliates: structuredClone(MOCK_AFFILIATES),
    registrationLinks: { [MOCK_VENDOR.store.store_id]: structuredClone(MOCK_REGISTRATION_LINK) },
    affiliatePasswords: { [DEMO_AFFILIATE_CREDENTIALS.affiliate_id]: DEMO_AFFILIATE_CREDENTIALS.password },
    /** token → { affiliate_id, impersonation } */
    affiliateTokens: {},
    nextVendorId: 1025,
    nextStoreId: 3052,
    nextAffiliateId: 5001 + MOCK_AFFILIATES.length,
};

export class ApiError extends Error {
    constructor(status, message, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

const fail = (status, message, errors) => {
    throw new ApiError(status, message, errors);
};

const randomToken = (length = 8) =>
    Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) =>
        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[byte % 56],
    ).join('');

/**
 * The vendor making the request. The real backend derives this from the bearer
 * token; the mock reads the persisted session (its in-memory db resets on reload).
 */
function currentVendor() {
    const sessionVendor = sessionStore.get()?.vendor;

    if (!sessionVendor) {
        fail(401, 'انتهت الجلسة، سجّل الدخول مرة أخرى');
    }

    return db.vendors.find((vendor) => vendor.vendor_id === sessionVendor.vendor_id) ?? sessionVendor;
}

/** Every affiliate query is scoped to the current vendor's store. */
function storeAffiliates() {
    const { store_id } = currentVendor().store;

    return db.affiliates.filter((affiliate) => affiliate.store_id === store_id);
}

function findStoreBySlug(slug) {
    return db.vendors.find((vendor) => vendor.store.slug === slug)?.store ?? null;
}

/** Resolves the affiliate behind a portal or impersonation token (mirrors EnsureAffiliateToken). */
function currentAffiliate(token) {
    const session = db.affiliateTokens[token] ?? fail(401, 'Unauthenticated.');
    const affiliate = db.affiliates.find((candidate) => candidate.affiliate_id === session.affiliate_id) ?? fail(401, 'Unauthenticated.');

    session.impersonation || affiliate.status === 'active' || fail(403, 'حسابك غير نشط حالياً، تواصل مع المتجر.');

    return { affiliate, impersonation: session.impersonation };
}

/** Affiliate-facing view: no internal commission note, freeze reason or full account numbers. */
function affiliateSelfView(affiliate) {
    const store = db.vendors.find((vendor) => vendor.store.store_id === affiliate.store_id).store;
    const override = affiliate.commission_override;

    return structuredClone({
        affiliate_id: affiliate.affiliate_id,
        full_name: affiliate.full_name,
        phone: affiliate.phone,
        email: affiliate.email,
        avatar_url: affiliate.avatar_url,
        status: affiliate.status,
        tier: affiliate.tier,
        commission: override ? { type: override.type, value: override.value } : { type: 'percentage', value: AFFILIATE_TIERS[affiliate.tier].default_commission },
        payout_method: {
            type: affiliate.payout_method.type,
            account_name: affiliate.payout_method.account_name,
            account_number_last4: String(affiliate.payout_method.account_number).slice(-4),
            bank_name: affiliate.payout_method.bank_name,
        },
        referral_codes: affiliate.referral_codes,
        stats: affiliate.stats,
        store: { name: store.name, slug: store.slug, logo_url: store.logo_url },
        joined_at: affiliate.joined_at,
    });
}

/** Public lookup by token; unknown and disabled links are indistinguishable (404). */
function findPublicLink(token) {
    const link = Object.values(db.registrationLinks).find((candidate) => candidate.token === token && candidate.is_enabled);
    const store = link && db.vendors.find((vendor) => vendor.store.store_id === link.store_id)?.store;

    return link && store ? { link, store } : fail(404, 'رابط التسجيل غير صالح أو متوقف حالياً');
}

function registrationLinkFor(store) {
    db.registrationLinks[store.store_id] ??= buildRegistrationLink(store, randomToken(8));

    return db.registrationLinks[store.store_id];
}

function findAffiliate(id) {
    return storeAffiliates().find((affiliate) => affiliate.affiliate_id === Number(id)) ?? fail(404, 'المسوق غير موجود');
}

function assertUniqueAffiliatePhone(phone, ignoreId = null) {
    const normalized = normalizePhone(phone);

    if (storeAffiliates().some((affiliate) => normalizePhone(affiliate.phone) === normalized && affiliate.affiliate_id !== ignoreId)) {
        fail(422, 'بيانات غير صالحة', { phone: 'رقم الهاتف مسجل لمسوق آخر بالفعل' });
    }
}

/** `vendor` defaults to the logged-in vendor; public self-registration passes the link's owner. */
function buildAffiliateRecord(input, source, vendor = currentVendor()) {
    const affiliate_id = db.nextAffiliateId++;

    return {
        affiliate_id,
        vendor_id: vendor.vendor_id,
        store_id: vendor.store.store_id,
        full_name: input.full_name.trim(),
        phone: normalizePhone(input.phone),
        email: input.email?.trim() || null,
        avatar_url: input.avatar instanceof File ? URL.createObjectURL(input.avatar) : null,
        status: input.status ?? 'active',
        tier: input.tier ?? 'new',
        payout_method: {
            type: input.payout_method?.type ?? 'vodafone_cash',
            account_name: input.payout_method?.account_name || input.full_name.trim(),
            account_number: input.payout_method?.account_number ?? '',
            bank_name: input.payout_method?.bank_name || null,
            iban: input.payout_method?.iban || null,
        },
        commission_override: null,
        referral_codes: [],
        stats: { orders_count: 0, sales_total: 0, earned_commission: 0, pending_balance: 0 },
        source,
        frozen_reason: null,
        joined_at: new Date().toISOString(),
        last_active_at: null,
    };
}

function generateReferralCode(affiliate, storeSlug = currentVendor().store.slug) {
    const code = `MK${affiliate.affiliate_id}${randomToken(2).toUpperCase()}`;

    return {
        referral_code_id: Date.now(),
        code,
        url: buildReferralUrl(code, storeSlug),
        clicks: 0,
        orders: 0,
        is_active: true,
        created_at: new Date().toISOString(),
    };
}

/** Route table: [method, pattern, handler(params, body, query)] */
const routes = [
    /* ---------------------------- Vendor auth ---------------------------- */
    [
        'POST',
        /^\/api\/v1\/vendor\/auth\/login$/,
        (_, body) => {
            const identifier = String(body.identifier ?? '').trim().toLowerCase();
            const vendor = db.vendors.find(
                (candidate) => candidate.email.toLowerCase() === identifier || normalizePhone(candidate.phone) === normalizePhone(identifier),
            );
            const credential = vendor && db.credentials.find((entry) => entry.vendor_id === vendor.vendor_id);

            if (!vendor || credential.password !== body.password) {
                fail(422, 'بيانات الدخول غير صحيحة', { identifier: 'البريد الإلكتروني / رقم الهاتف أو كلمة المرور غير صحيحة' });
            }

            return { token: `mk_${randomToken(24)}`, vendor: structuredClone(vendor) };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/auth\/register$/,
        (_, body) => {
            const { vendor: vendorInput, store: storeInput } = body;
            const errors = {};

            if (db.vendors.some((vendor) => vendor.email.toLowerCase() === vendorInput.email.toLowerCase())) {
                errors['vendor.email'] = 'البريد الإلكتروني مسجل بالفعل';
            }

            if (db.vendors.some((vendor) => normalizePhone(vendor.phone) === normalizePhone(vendorInput.phone))) {
                errors['vendor.phone'] = 'رقم الهاتف مسجل بالفعل';
            }

            if (isSlugTaken(storeInput.slug)) {
                errors['store.slug'] = 'هذا الرابط محجوز، جرّب اسماً آخر';
            }

            if (Object.keys(errors).length) {
                fail(422, 'بيانات غير صالحة', errors);
            }

            const vendor_id = db.nextVendorId++;
            const vendor = {
                vendor_id,
                full_name: vendorInput.full_name,
                phone: normalizePhone(vendorInput.phone),
                email: vendorInput.email,
                created_at: new Date().toISOString(),
                store: {
                    store_id: db.nextStoreId++,
                    vendor_id,
                    name: storeInput.name,
                    slug: storeInput.slug,
                    logo_url: storeInput.logo instanceof File ? URL.createObjectURL(storeInput.logo) : null,
                    governorate_id: storeInput.governorate_id,
                    city_id: storeInput.city_id,
                },
            };

            db.vendors.push(vendor);
            db.credentials.push({ vendor_id, identifier: vendor.email, password: vendorInput.password });

            return { token: `mk_${randomToken(24)}`, vendor: structuredClone(vendor) };
        },
    ],
    ['POST', /^\/api\/v1\/vendor\/auth\/logout$/, () => ({})],
    [
        'POST',
        /^\/api\/v1\/vendor\/auth\/reset-password$/,
        (_, body) => {
            const vendor = db.vendors.find((candidate) => candidate.email === body.email);
            const credential = vendor && db.credentials.find((entry) => entry.vendor_id === vendor.vendor_id);

            // The mock has no real tokens; "expired" simulates an invalid link.
            if (!credential || body.token === 'expired') {
                fail(422, 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية', { email: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
            }

            credential.password = body.password;

            return { message: 'تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن.' };
        },
    ],
    [
        'GET',
        /^\/api\/v1\/stores\/slug-availability$/,
        (_, __, query) => ({ slug: query.slug, available: !isSlugTaken(query.slug) }),
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/auth\/forgot-password$/,
        () => {
            return {
                channel: 'email',
                message: 'إذا كان الحساب موجوداً، ستصلك رسالة على بريدك الإلكتروني المسجل بخطوات إعادة تعيين كلمة المرور.',
            };
        },
    ],

    /* --------------------------- Affiliate portal --------------------------- */
    [
        'GET',
        /^\/api\/v1\/stores\/([^/]+)$/,
        ([slug]) => {
            const store = findStoreBySlug(slug) ?? fail(404, 'المتجر غير موجود');

            return { name: store.name, slug: store.slug, logo_url: store.logo_url };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/affiliate\/auth\/login$/,
        (_, body) => {
            const store = findStoreBySlug(body.store_slug) ?? fail(422, 'بيانات غير صالحة', { store_slug: 'المتجر غير موجود' });
            const identifier = String(body.identifier ?? '').trim().toLowerCase();
            const affiliate = db.affiliates.find(
                (candidate) => candidate.store_id === store.store_id && (normalizePhone(candidate.phone) === normalizePhone(identifier) || candidate.email?.toLowerCase() === identifier),
            );
            const password = affiliate && db.affiliatePasswords[affiliate.affiliate_id];

            if (!password || password !== body.password) {
                fail(422, 'بيانات غير صالحة', { identifier: 'رقم الهاتف / البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            if (affiliate.status !== 'active') {
                fail(422, 'بيانات غير صالحة', {
                    identifier: affiliate.status === 'pending' ? 'طلب انضمامك قيد المراجعة، وستتمكن من الدخول فور موافقة صاحب المتجر.' : 'حسابك موقوف حالياً، تواصل مع المتجر لمزيد من التفاصيل.',
                });
            }

            const token = `aff_${randomToken(24)}`;

            db.affiliateTokens[token] = { affiliate_id: affiliate.affiliate_id, impersonation: false };

            return { token, affiliate: affiliateSelfView(affiliate) };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/affiliate\/auth\/forgot-password$/,
        (_, body) => {
            findStoreBySlug(body.store_slug) ?? fail(422, 'بيانات غير صالحة', { store_slug: 'المتجر غير موجود' });

            // The mock sends no email; the response is identical either way, as in the real API.
            return { message: 'إذا كان لحسابك بريد إلكتروني مسجل، ستصلك رسالة بها رابط لتعيين كلمة مرور جديدة خلال دقائق.' };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/affiliate\/auth\/reset-password$/,
        (_, body) => {
            const store = findStoreBySlug(body.store_slug);
            const affiliate = store && db.affiliates.find((candidate) => candidate.affiliate_id === Number(body.affiliate_id) && candidate.store_id === store.store_id);

            // The mock has no real tokens; "expired" simulates an invalid link.
            if (!affiliate || body.token === 'expired') {
                fail(422, 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية', { token: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
            }

            db.affiliatePasswords[affiliate.affiliate_id] = body.password;

            return { message: 'تم تعيين كلمة المرور الجديدة، يمكنك تسجيل الدخول الآن.' };
        },
    ],
    ['GET', /^\/api\/v1\/affiliate\/auth\/me$/, (_, __, ___, token) => affiliateSelfView(currentAffiliate(token).affiliate)],
    [
        'POST',
        /^\/api\/v1\/affiliate\/auth\/logout$/,
        (_, __, ___, token) => {
            delete db.affiliateTokens[token];

            return {};
        },
    ],
    [
        'PUT',
        /^\/api\/v1\/affiliate\/auth\/password$/,
        (_, body, __, token) => {
            const { affiliate, impersonation } = currentAffiliate(token);

            !impersonation || fail(403, 'هذا الإجراء غير متاح أثناء الدخول بصفة المسوق.');
            db.affiliatePasswords[affiliate.affiliate_id] === body.current_password || fail(422, 'بيانات غير صالحة', { current_password: 'كلمة المرور الحالية غير صحيحة' });
            db.affiliatePasswords[affiliate.affiliate_id] = body.password;

            return { message: 'تم تغيير كلمة المرور، وتم تسجيل الخروج من الأجهزة الأخرى.' };
        },
    ],

    /* ------------------- Affiliate self-registration (public) ------------------- */
    [
        'GET',
        /^\/api\/v1\/affiliate-registration\/([^/]+)$/,
        ([token]) => {
            const { link, store } = findPublicLink(token);

            return {
                store: { name: store.name, slug: store.slug, logo_url: store.logo_url },
                tier: link.default_tier,
                commission_percentage: AFFILIATE_TIERS[link.default_tier].default_commission,
                requires_approval: !link.auto_approve,
            };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/affiliate-registration\/([^/]+)$/,
        ([token], body) => {
            const { link, store } = findPublicLink(token);
            const phone = normalizePhone(body.phone);

            if (db.affiliates.some((affiliate) => affiliate.store_id === store.store_id && normalizePhone(affiliate.phone) === phone)) {
                fail(422, 'بيانات غير صالحة', { phone: 'هذا الرقم مسجل بالفعل ضمن مسوقي هذا المتجر' });
            }

            const vendor = db.vendors.find((candidate) => candidate.store.store_id === store.store_id);
            const affiliate = buildAffiliateRecord(
                { ...body, tier: link.default_tier, status: link.auto_approve ? 'active' : 'pending' },
                'self_registration',
                vendor,
            );

            if (link.auto_approve) {
                affiliate.referral_codes.push(generateReferralCode(affiliate, store.slug));
            }

            db.affiliates.unshift(affiliate);
            db.affiliatePasswords[affiliate.affiliate_id] = body.password;
            const referral = affiliate.referral_codes[0];

            return {
                affiliate_id: affiliate.affiliate_id,
                full_name: affiliate.full_name,
                status: affiliate.status,
                requires_approval: !link.auto_approve,
                referral_code: referral?.code ?? null,
                referral_url: referral?.url ?? null,
                message: link.auto_approve
                    ? 'تم تسجيلك بنجاح! يمكنك البدء في مشاركة رابط الإحالة الخاص بك الآن.'
                    : 'تم استلام طلب انضمامك، وسيتم إشعارك فور موافقة صاحب المتجر.',
            };
        },
    ],

    /* ----------------------------- Affiliates ----------------------------- */
    [
        'GET',
        /^\/api\/v1\/vendor\/affiliates$/,
        (_, __, query) => {
            const search = (query.search ?? '').trim().toLowerCase();
            const page = Math.max(1, Number(query.page ?? 1));
            const per_page = Number(query.per_page ?? 10);

            const filtered = storeAffiliates()
                .filter((affiliate) => !query.tier || affiliate.tier === query.tier)
                .filter((affiliate) => !query.status || affiliate.status === query.status)
                .filter((affiliate) => !query.payout_method || affiliate.payout_method.type === query.payout_method)
                .filter(
                    (affiliate) =>
                        !search ||
                        affiliate.full_name.toLowerCase().includes(search) ||
                        affiliate.phone.includes(normalizePhone(search)) ||
                        affiliate.email?.toLowerCase().includes(search) ||
                        affiliate.referral_codes.some((referral) => referral.code.toLowerCase().includes(search)),
                )
                .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));

            const last_page = Math.max(1, Math.ceil(filtered.length / per_page));

            return {
                data: structuredClone(filtered.slice((page - 1) * per_page, page * per_page)),
                meta: { current_page: Math.min(page, last_page), per_page, total: filtered.length, last_page },
            };
        },
    ],
    [
        'GET',
        /^\/api\/v1\/vendor\/affiliates\/summary$/,
        () => {
            const affiliates = storeAffiliates();
            const countBy = (status) => affiliates.filter((affiliate) => affiliate.status === status).length;

            return {
                total: affiliates.length,
                active: countBy('active'),
                frozen: countBy('frozen'),
                pending: countBy('pending'),
                sales_total: affiliates.reduce((sum, affiliate) => sum + affiliate.stats.sales_total, 0),
                earned_commission: affiliates.reduce((sum, affiliate) => sum + affiliate.stats.earned_commission, 0),
            };
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/affiliates$/,
        (_, body) => {
            assertUniqueAffiliatePhone(body.phone);
            const affiliate = buildAffiliateRecord(body, 'manual');

            affiliate.referral_codes.push(generateReferralCode(affiliate));
            db.affiliates.unshift(affiliate);

            return structuredClone(affiliate);
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/affiliates\/import$/,
        (_, body) => {
            const errors = [];
            let imported = 0;

            // Rows use the CSV template columns (same contract as the Laravel endpoint).
            body.rows.forEach((row, index) => {
                try {
                    assertUniqueAffiliatePhone(row.phone);
                    const affiliate = buildAffiliateRecord(
                        {
                            full_name: row.full_name,
                            phone: row.phone,
                            email: row.email,
                            tier: row.tier || 'new',
                            payout_method: {
                                type: row.payout_type || 'vodafone_cash',
                                account_name: row.payout_account_name || row.full_name,
                                account_number: row.payout_account_number || row.phone,
                            },
                        },
                        'bulk_import',
                    );

                    affiliate.referral_codes.push(generateReferralCode(affiliate));
                    db.affiliates.unshift(affiliate);
                    imported++;
                } catch (error) {
                    errors.push({ row: row.line ?? index + 2, message: Object.values(error.errors ?? {})[0] ?? error.message });
                }
            });

            return { status: 'completed', imported, skipped: errors.length, errors };
        },
    ],
    [
        'GET',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)$/,
        ([id]) => structuredClone(findAffiliate(id)),
    ],
    [
        'PUT',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)$/,
        ([id], body) => {
            const affiliate = findAffiliate(id);

            assertUniqueAffiliatePhone(body.phone, affiliate.affiliate_id);
            Object.assign(affiliate, {
                full_name: body.full_name.trim(),
                phone: normalizePhone(body.phone),
                email: body.email?.trim() || null,
                tier: body.tier,
                avatar_url: body.avatar instanceof File ? URL.createObjectURL(body.avatar) : body.remove_avatar ? null : affiliate.avatar_url,
                payout_method: { ...affiliate.payout_method, ...body.payout_method },
            });

            return structuredClone(affiliate);
        },
    ],
    [
        'DELETE',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)$/,
        ([id]) => {
            findAffiliate(id);
            db.affiliates = db.affiliates.filter((affiliate) => affiliate.affiliate_id !== Number(id));

            return { deleted: true };
        },
    ],
    [
        'PATCH',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)\/status$/,
        ([id], body) => {
            const affiliate = findAffiliate(id);

            affiliate.status = body.status;
            affiliate.frozen_reason = body.status === 'frozen' ? body.reason || null : null;
            affiliate.referral_codes.forEach((referral) => {
                referral.is_active = body.status === 'active';
            });

            if (body.status === 'active' && affiliate.referral_codes.length === 0) {
                affiliate.referral_codes.push(generateReferralCode(affiliate));
            }

            return structuredClone(affiliate);
        },
    ],
    [
        'PUT',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)\/commission$/,
        ([id], body) => {
            const affiliate = findAffiliate(id);

            affiliate.commission_override = body.use_tier_default
                ? null
                : { type: body.type, value: Number(body.value), note: body.note || null };

            return structuredClone(affiliate);
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)\/referral-codes$/,
        ([id]) => {
            const affiliate = findAffiliate(id);

            affiliate.status === 'active' || fail(422, 'لا يمكن إنشاء كود لمسوق غير نشط');
            affiliate.referral_codes.push(generateReferralCode(affiliate));

            return structuredClone(affiliate);
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/affiliates\/(\d+)\/impersonate$/,
        ([id]) => {
            const affiliate = findAffiliate(id);

            affiliate.status !== 'pending' || fail(422, 'لا يمكن الدخول بحساب مسوق لم تتم الموافقة عليه بعد');

            const token = `imp_${randomToken(24)}`;

            db.affiliateTokens[token] = { affiliate_id: affiliate.affiliate_id, impersonation: true };

            return {
                token,
                expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
                affiliate: structuredClone(affiliate),
            };
        },
    ],

    /* -------------------------- Registration link -------------------------- */
    ['GET', /^\/api\/v1\/vendor\/affiliates\/registration-link$/, () => structuredClone(registrationLinkFor(currentVendor().store))],
    [
        'PATCH',
        /^\/api\/v1\/vendor\/affiliates\/registration-link$/,
        (_, body) => {
            const link = registrationLinkFor(currentVendor().store);

            Object.assign(link, body);

            return structuredClone(link);
        },
    ],
    [
        'POST',
        /^\/api\/v1\/vendor\/affiliates\/registration-link\/regenerate$/,
        () => {
            const { store } = currentVendor();
            const { token, url } = buildRegistrationLink(store, randomToken(8));

            return structuredClone(Object.assign(registrationLinkFor(store), { token, url }));
        },
    ],
];

function isSlugTaken(slug) {
    return RESERVED_SLUGS.includes(slug) || TAKEN_SLUGS.includes(slug) || db.vendors.some((vendor) => vendor.store.slug === slug);
}

/** Resolves a request against the route table with simulated network latency. */
export async function handleMockRequest(method, path, { body, query, token }) {
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 350));

    for (const [routeMethod, pattern, handler] of routes) {
        const match = method === routeMethod && path.match(pattern);

        if (match) {
            return handler(match.slice(1), body ?? {}, query ?? {}, token);
        }
    }

    throw new ApiError(404, `Mock route not found: ${method} ${path}`);
}
