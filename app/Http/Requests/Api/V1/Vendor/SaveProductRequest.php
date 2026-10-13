<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Creates or updates a product with its options and variants (POST /products, PUT /products/{product}).
 *
 * Payload: options = [{name, values[]}] (0–3), variants = [{id?, option_values[], price,
 * compare_at_price?, sku?, stock}]. Without options there must be exactly one variant
 * with empty option_values.
 */
class SaveProductRequest extends FormRequest
{
    /**
     * Another store's product is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        $product = $this->route('product');

        return $product ? Gate::inspect('update', $product) : Response::allow();
    }

    /**
     * Trim option names and values so " M" and "M" count as the same value.
     */
    protected function prepareForValidation(): void
    {
        $trim = fn (mixed $value): mixed => is_string($value) ? trim($value) : $value;

        $this->merge([
            'options' => collect($this->input('options', []))->map(fn (mixed $option): mixed => is_array($option) ? [
                'name' => $trim($option['name'] ?? null),
                'values' => collect($option['values'] ?? [])->map($trim)->all(),
            ] : $option)->all(),
            'variants' => collect($this->input('variants', []))->map(fn (mixed $variant): mixed => is_array($variant) ? [
                ...$variant,
                'option_values' => collect($variant['option_values'] ?? [])->map($trim)->all(),
                'sku' => filled($variant['sku'] ?? null) ? trim($variant['sku']) : null,
            ] : $variant)->all(),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', Rule::exists('product_categories', 'id')->where('store_id', $this->user()->store->id)],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::enum(ProductStatus::class)],
            'is_featured' => ['sometimes', 'boolean'],

            'options' => ['present', 'array', 'max:3'],
            'options.*' => ['array'],
            'options.*.name' => ['required', 'string', 'max:30'],
            'options.*.values' => ['required', 'array', 'min:1', 'max:30'],
            'options.*.values.*' => ['required', 'string', 'max:30'],

            'variants' => ['required', 'array', 'min:1', 'max:'.config('makhzan.products.max_variants')],
            'variants.*' => ['array'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.option_values' => ['present', 'array'],
            'variants.*.option_values.*' => ['string'],
            'variants.*.price' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'variants.*.compare_at_price' => ['nullable', 'numeric', 'max:10000000'],
            'variants.*.cost' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'variants.*.sku' => ['nullable', 'string', 'max:60'],
            'variants.*.stock' => ['required', 'integer', 'min:0', 'max:1000000'],
        ];
    }

    /**
     * Cross-field rules: options vs. variants, unique combinations, prices and SKUs.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $this->validateOptions($validator);
                $this->validateVariants($validator);
                $this->validateSkus($validator);
            },
        ];
    }

    private function validateOptions(Validator $validator): void
    {
        $options = $this->input('options');
        $names = array_map('mb_strtolower', array_column($options, 'name'));

        if (count($names) !== count(array_unique($names))) {
            $validator->errors()->add('options', __('products.option_name_duplicate'));
        }

        foreach ($options as $index => $option) {
            $values = array_map('mb_strtolower', $option['values']);

            if (count($values) !== count(array_unique($values))) {
                $validator->errors()->add("options.{$index}.values", __('products.option_values_duplicate', ['option' => $option['name']]));
            }
        }
    }

    private function validateVariants(Validator $validator): void
    {
        $options = $this->input('options');
        $variants = $this->input('variants');

        if ($options === [] && count($variants) !== 1) {
            $validator->errors()->add('variants', __('products.simple_single_variant'));

            return;
        }

        $combinations = [];

        foreach ($variants as $index => $variant) {
            $values = $variant['option_values'];
            $matchesOptions = count($values) === count($options)
                && collect($values)->every(fn (string $value, int $position): bool => in_array($value, $options[$position]['values'], true));

            if (! $matchesOptions) {
                $validator->errors()->add("variants.{$index}.option_values", __('products.variant_mismatch'));

                continue;
            }

            $key = mb_strtolower(implode('|', $values));

            if (isset($combinations[$key])) {
                $validator->errors()->add("variants.{$index}.option_values", __('products.variant_duplicate'));
            }

            $combinations[$key] = true;

            if (isset($variant['compare_at_price']) && (float) $variant['compare_at_price'] <= (float) $variant['price']) {
                $validator->errors()->add("variants.{$index}.compare_at_price", __('products.compare_at_price_invalid'));
            }
        }

        $product = $this->route('product');
        $ownIds = $product ? $product->variants()->pluck('id')->all() : [];
        $foreignIds = collect($variants)->pluck('id')->filter()->diff($ownIds);

        if ($foreignIds->isNotEmpty()) {
            $validator->errors()->add('variants', __('products.variant_foreign'));
        }
    }

    /**
     * SKUs are unique across the store's products (soft-deleted ones included).
     */
    private function validateSkus(Validator $validator): void
    {
        $skus = collect($this->input('variants'))->pluck('sku')->filter();

        foreach ($skus->duplicates() as $index => $sku) {
            $validator->errors()->add("variants.{$index}.sku", __('products.sku_duplicate'));
        }

        if ($skus->isEmpty()) {
            return;
        }

        $taken = ProductVariant::query()
            ->whereIn('sku', $skus->values())
            ->whereHas('product', fn ($query) => $query->withTrashed()->where('store_id', $this->user()->store->id))
            ->when($this->route('product'), fn ($query, Product $product) => $query->where('product_id', '!=', $product->id))
            ->pluck('sku')
            ->all();

        foreach ($skus as $index => $sku) {
            if (in_array($sku, $taken, true)) {
                $validator->errors()->add("variants.{$index}.sku", __('products.sku_taken'));
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_id.required' => __('products.category_required'),
            'category_id.exists' => __('products.category_not_found'),
            'name.required' => __('products.name_required'),
            'name.max' => __('products.name_max'),
            'status.required' => __('products.status_required'),
            'options.max' => __('products.options_max'),
            'options.*.name.required' => __('products.option_name_required'),
            'options.*.values.required' => __('products.option_values_required'),
            'options.*.values.max' => __('products.option_values_max'),
            'variants.required' => __('products.variants_required'),
            'variants.max' => __('products.variants_max'),
            'variants.*.price.required' => __('products.price_required'),
            'variants.*.price.numeric' => __('products.price_numeric'),
            'variants.*.price.min' => __('products.price_min'),
            'variants.*.cost.numeric' => __('products.cost_numeric'),
            'variants.*.cost.min' => __('products.cost_min'),
            'variants.*.stock.required' => __('products.stock_required'),
            'variants.*.stock.integer' => __('products.stock_integer'),
            'variants.*.stock.min' => __('products.stock_min'),
        ];
    }
}
