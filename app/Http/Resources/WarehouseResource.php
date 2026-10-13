<?php

namespace App\Http\Resources;

use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Warehouse
 */
class WarehouseResource extends JsonResource
{
    /**
     * Transform the resource into an array. `units` and `cost_value` come from the list query.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'warehouse_id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'governorate_id' => $this->governorate_id,
            'priority' => $this->priority,
            'units' => $this->when(isset($this->units), fn (): int => (int) $this->units),
            'cost_value' => $this->when(isset($this->cost_value), fn (): float => round((float) $this->cost_value, 2)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
