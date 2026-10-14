<?php

namespace App\Http\Resources;

use App\Models\Admin;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A subscription plan. Admins also see its state and how many stores use it.
 *
 * @mixin Plan
 */
class PlanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'plan_id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_monthly' => $this->price_monthly,
            'price_yearly' => $this->price_yearly,
            'max_products' => $this->max_products,
            'max_staff' => $this->max_staff,
            'features' => array_values($this->features?->all() ?? []),
            $this->mergeWhen($request->user() instanceof Admin, fn (): array => [
                'is_active' => $this->is_active,
                'position' => $this->position,
                'stores_count' => $this->whenCounted('stores'),
            ]),
        ];
    }
}
