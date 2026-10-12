/**
 * Entity shapes for the `makhzan` database, mirrored on the frontend.
 * Field names intentionally match the backend columns (snake_case).
 *
 * @typedef {'active' | 'frozen' | 'pending'} AffiliateStatus
 * @typedef {'new' | 'general' | 'vip'} AffiliateTier
 * @typedef {'vodafone_cash' | 'instapay' | 'bank_account' | 'orange_cash' | 'we_cash' | 'etisalat_cash'} PayoutMethodType
 * @typedef {'manual' | 'self_registration' | 'bulk_import'} AffiliateSource
 *
 * @typedef {Object} Store
 * @property {number} store_id
 * @property {number} vendor_id
 * @property {string} name
 * @property {string} slug
 * @property {string|null} logo_url
 * @property {string} governorate_id
 * @property {string} city_id
 *
 * @typedef {Object} Vendor
 * @property {number} vendor_id
 * @property {string} full_name
 * @property {string} phone
 * @property {string} email
 * @property {Store} store
 * @property {string} created_at
 *
 * @typedef {Object} PayoutAccount
 * @property {PayoutMethodType} type
 * @property {string} account_name     Name on the wallet / bank account.
 * @property {string} account_number   Wallet number, phone, or bank account number.
 * @property {string|null} bank_name
 * @property {string|null} iban
 *
 * @typedef {Object} CommissionOverride
 * @property {'percentage' | 'fixed'} type
 * @property {number} value
 * @property {string|null} note
 *
 * @typedef {Object} ReferralCode
 * @property {number} referral_code_id
 * @property {string} code
 * @property {string} url
 * @property {number} clicks
 * @property {number} orders
 * @property {boolean} is_active
 * @property {string} created_at
 *
 * @typedef {Object} AffiliateStats
 * @property {number} orders_count
 * @property {number} sales_total
 * @property {number} earned_commission
 * @property {number} pending_balance
 *
 * @typedef {Object} Affiliate
 * @property {number} affiliate_id
 * @property {number} vendor_id
 * @property {number} store_id
 * @property {string} full_name
 * @property {string} phone
 * @property {string|null} email
 * @property {string|null} avatar_url
 * @property {AffiliateStatus} status
 * @property {AffiliateTier} tier
 * @property {PayoutAccount} payout_method
 * @property {CommissionOverride|null} commission_override
 * @property {ReferralCode[]} referral_codes
 * @property {AffiliateStats} stats
 * @property {AffiliateSource} source
 * @property {string|null} frozen_reason
 * @property {string} joined_at
 * @property {string|null} last_active_at
 *
 * @typedef {Object} RegistrationLinkSettings
 * @property {number} store_id
 * @property {string} token
 * @property {string} url
 * @property {boolean} is_enabled
 * @property {boolean} auto_approve
 * @property {AffiliateTier} default_tier
 *
 * @typedef {Object} Paginated
 * @property {Array} data
 * @property {{ current_page: number, per_page: number, total: number, last_page: number }} meta
 */

export {};
