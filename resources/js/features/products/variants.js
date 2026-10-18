import { t } from '@/i18n';

/**
 * Product options/variants form state:
 * {
 *   hasOptions: boolean,
 *   options: Array<{ name: string, values: string[] }>,
 *   rows: Record<comboKey, { id?: number, price: string, compare_at_price: string, cost: string, sku: string, stock: string, warehouseStocks: Record<warehouseId, string>, enabled: boolean }>,
 *   simple: { id?: number, price: string, compare_at_price: string, cost: string, sku: string, stock: string, warehouseStocks: Record<warehouseId, string> },
 * }
 * Rows are keyed by option combination so price/stock survive edits to the options.
 * When the store has more than one warehouse the quantity is entered per warehouse
 * (`warehouseStocks`, missing warehouses count as 0) and `stock` is not used.
 */

const SEPARATOR = '\u0001';

export const comboKey = (values) => values.join(SEPARATOR);

const blankRow = (defaults = {}) => ({ price: '', compare_at_price: '', cost: '', sku: '', stock: '0', warehouseStocks: {}, enabled: true, ...defaults });

const toField = (value) => (value === null || value === undefined ? '' : String(value));

/** Every combination of the options' values, in option order: [['أحمر','S'], ['أحمر','M'], ...]. */
export function combinations(options) {
    const usable = options.filter((option) => option.values.length > 0);

    if (usable.length === 0) {
        return [];
    }

    return usable.reduce((result, option) => result.flatMap((prefix) => option.values.map((value) => [...prefix, value])), [[]]);
}

export function emptyVariantsState() {
    return { hasOptions: false, options: [], rows: {}, simple: blankRow() };
}

export function variantsStateFromProduct(product) {
    if (!product) {
        return emptyVariantsState();
    }

    const toRow = (variant) => ({
        id: variant.variant_id,
        price: toField(variant.price),
        compare_at_price: toField(variant.compare_at_price),
        cost: toField(variant.cost),
        sku: toField(variant.sku),
        stock: toField(variant.stock),
        warehouseStocks: Object.fromEntries((variant.warehouses ?? []).map((warehouse) => [warehouse.warehouse_id, toField(warehouse.stock)])),
        enabled: true,
    });

    if (product.options.length === 0) {
        return { ...emptyVariantsState(), simple: toRow(product.variants[0]) };
    }

    const rows = Object.fromEntries(product.variants.map((variant) => [comboKey(variant.option_values), toRow(variant)]));

    // Combinations the vendor left out when saving show up as disabled rows.
    combinations(product.options).forEach((values) => {
        rows[comboKey(values)] ??= blankRow({ enabled: false });
    });

    return { hasOptions: true, options: product.options.map((option) => ({ name: option.name, values: [...option.values] })), rows, simple: blankRow() };
}

/** Fills rows for new combinations, defaulting their price to the first existing price. */
export function syncRows(state) {
    const defaultPrice = Object.values(state.rows).find((row) => row.price !== '')?.price ?? state.simple.price ?? '';
    const rows = { ...state.rows };

    combinations(state.options).forEach((values) => {
        rows[comboKey(values)] ??= blankRow({ price: defaultPrice });
    });

    return { ...state, rows };
}

const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));

/** The row's quantity in one warehouse, as typed (a warehouse never filled in counts as 0). */
export const warehouseStockOf = (row, warehouseId) => row.warehouseStocks?.[warehouseId] ?? '0';

/** True when quantities are entered per warehouse rather than as one total. */
export const isPerWarehouse = (warehouses) => (warehouses?.length ?? 0) > 1;

/**
 * @param {object} state
 * @param {Array<{ warehouse_id: number }>|null} warehouses  the store's warehouses; with more than one, each variant sends warehouse_stocks
 * @returns {{ options: Array<{ name: string, values: string[] }>, variants: object[], keys: string[] }}
 *   `keys[i]` is the row key of `variants[i]`, to map server errors (variants.i.price) back to rows.
 */
export function buildVariantsPayload(state, warehouses = null) {
    const perWarehouse = isPerWarehouse(warehouses);

    const toVariant = (row, optionValues) => {
        const warehouseStocks = perWarehouse ? warehouses.map((warehouse) => ({ warehouse_id: warehouse.warehouse_id, stock: numberOrNull(warehouseStockOf(row, warehouse.warehouse_id)) ?? 0 })) : null;

        return {
            ...(row.id && { id: row.id }),
            option_values: optionValues,
            price: numberOrNull(row.price),
            compare_at_price: numberOrNull(row.compare_at_price),
            cost: numberOrNull(row.cost),
            sku: row.sku.trim() || null,
            stock: warehouseStocks ? warehouseStocks.reduce((total, warehouseStock) => total + warehouseStock.stock, 0) : (numberOrNull(row.stock) ?? 0),
            ...(warehouseStocks && { warehouse_stocks: warehouseStocks }),
        };
    };

    if (!state.hasOptions) {
        return { options: [], variants: [toVariant(state.simple, [])], keys: ['simple'] };
    }

    const options = state.options.map((option) => ({ name: option.name.trim(), values: option.values }));
    const enabled = combinations(options).filter((values) => state.rows[comboKey(values)]?.enabled);

    return { options, variants: enabled.map((values) => toVariant(state.rows[comboKey(values)], values)), keys: enabled.map(comboKey) };
}

const isValidQuantity = (value) => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0;

function rowErrors(row, warehouses) {
    const errors = {};
    const price = Number(row.price);

    if (row.price === '' || Number.isNaN(price) || price < 0) {
        errors.price = t('أدخل السعر');
    }

    if (row.compare_at_price !== '' && !(Number(row.compare_at_price) > price)) {
        errors.compare_at_price = t('يجب أن يكون أكبر من السعر');
    }

    if (row.cost !== '' && (Number.isNaN(Number(row.cost)) || Number(row.cost) < 0)) {
        errors.cost = t('أدخل تكلفة صحيحة');
    }

    if (isPerWarehouse(warehouses)) {
        if (!warehouses.every((warehouse) => isValidQuantity(warehouseStockOf(row, warehouse.warehouse_id)))) {
            errors.warehouse_stocks = t('أدخل كمية صحيحة لكل مخزن');
        }
    } else if (!isValidQuantity(row.stock)) {
        errors.stock = t('أدخل كمية صحيحة');
    }

    return errors;
}

/**
 * Client-side checks mirroring SaveProductRequest.
 * @param {object} state
 * @param {Array<{ warehouse_id: number }>|null} warehouses
 * @returns {Record<string, string>}  keys: "options", "options.{i}.name", "options.{i}.values", "simple.{field}", "rows.{key}.{field}"
 */
export function validateVariants(state, warehouses = null) {
    const errors = {};
    const addRowErrors = (prefix, row) => Object.entries(rowErrors(row, warehouses)).forEach(([field, message]) => (errors[`${prefix}.${field}`] = message));

    if (!state.hasOptions) {
        addRowErrors('simple', state.simple);

        return errors;
    }

    if (state.options.length === 0) {
        errors.options = t('أضف خياراً واحداً على الأقل، أو أوقف خيار المقاسات والألوان');
    }

    const names = state.options.map((option) => option.name.trim().toLowerCase());

    state.options.forEach((option, index) => {
        if (!option.name.trim()) {
            errors[`options.${index}.name`] = t('أدخل اسم الخيار');
        } else if (names.indexOf(option.name.trim().toLowerCase()) !== index) {
            errors[`options.${index}.name`] = t('اسم الخيار مكرر');
        }

        if (option.values.length === 0) {
            errors[`options.${index}.values`] = t('أضف قيمة واحدة على الأقل');
        }
    });

    const enabled = combinations(state.options).filter((values) => state.rows[comboKey(values)]?.enabled);

    if (state.options.length > 0 && enabled.length === 0 && !Object.keys(errors).some((key) => key.startsWith('options.'))) {
        errors.options = t('فعّل تركيبة واحدة على الأقل');
    }

    enabled.forEach((values) => addRowErrors(`rows.${comboKey(values)}`, state.rows[comboKey(values)]));

    return errors;
}

/** Maps server keys (variants.2.price, options.0.values) onto the form's error keys. */
export function mapVariantServerErrors(serverErrors, keys) {
    const mapped = {};

    Object.entries(serverErrors).forEach(([key, message]) => {
        const match = key.match(/^variants\.(\d+)\.(\w+)/);

        if (match) {
            const rowKey = keys[Number(match[1])];
            const field = match[2] === 'option_values' ? 'price' : match[2];

            mapped[rowKey === 'simple' ? `simple.${field}` : `rows.${rowKey}.${field}`] = message;
        } else if (key === 'variants') {
            mapped.options = message;
        } else if (key.startsWith('options')) {
            mapped[key.replace(/\.values\.\d+$/, '.values')] = message;
        } else {
            mapped[key] = message;
        }
    });

    return mapped;
}
