import { localized } from '@/i18n';

/**
 * Governorates and their cities, keyed by stable ids stored as `governorate_id` / `city_id`. The platform
 * admin manages them; the app loads them once (loadLocations) before it renders, so these stay synchronous.
 * GOVERNORATES lists only active entries (what forms offer); findGovernorate / findCity also know inactive
 * ones, so old orders and stores keep showing their names.
 */
export let GOVERNORATES = [];

let allGovernorates = [];

/** Fetches the list (GET /api/v1/locations) and fills GOVERNORATES; the admin page calls it again after a change. */
export async function loadLocations() {
    try {
        const response = await fetch('/api/v1/locations', { headers: { Accept: 'application/json' } });
        const { data } = await response.json();

        allGovernorates = data.map((governorate) => ({
            id: governorate.id,
            name: localized(governorate),
            isActive: governorate.is_active,
            cities: governorate.cities.map((city) => ({ id: city.id, name: localized(city), isActive: city.is_active })),
        }));
        GOVERNORATES = allGovernorates.filter((governorate) => governorate.isActive).map((governorate) => ({ ...governorate, cities: governorate.cities.filter((city) => city.isActive) }));
    } catch {
        // Offline or the API is down: forms show no governorates, the rest of the app still renders.
    }
}

export function findGovernorate(governorateId) {
    return allGovernorates.find((governorate) => governorate.id === governorateId) ?? null;
}

export function findCity(governorateId, cityId) {
    return findGovernorate(governorateId)?.cities.find((city) => city.id === cityId) ?? null;
}
