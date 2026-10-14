<?php

namespace App\Http\Requests\Api\V1;

use App\Models\ActivityLog;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filters for the activity log, shared by the admin panel and store owners.
 */
class ListActivityLogsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_id' => ['nullable', 'integer'],
            'actor_type' => ['nullable', Rule::in(['admin', 'vendor', 'customer', 'affiliate', 'system'])],
            'actor_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:40'],
            'subject_id' => ['nullable', 'integer'],
            'event' => ['nullable', 'string', 'max:60'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Applies the filters; `event` matches a prefix ("order" matches "order.status_changed").
     *
     * @param  Builder<ActivityLog>  $query
     * @return Builder<ActivityLog>
     */
    public function apply(Builder $query): Builder
    {
        $filters = $this->validated();

        return $query
            ->when($filters['store_id'] ?? null, fn (Builder $query, int $id) => $query->where('store_id', $id))
            ->when($filters['actor_type'] ?? null, fn (Builder $query, string $type) => $query->where('actor_type', $type))
            ->when($filters['actor_id'] ?? null, fn (Builder $query, int $id) => $query->where('actor_id', $id))
            ->when($filters['subject_type'] ?? null, fn (Builder $query, string $type) => $query->where('subject_type', $type))
            ->when($filters['subject_id'] ?? null, fn (Builder $query, int $id) => $query->where('subject_id', $id))
            ->when($filters['event'] ?? null, fn (Builder $query, string $event) => $query->where('event', 'like', str_replace(['%', '_'], ['\%', '\_'], $event).'%'))
            ->when($filters['search'] ?? null, fn (Builder $query, string $term) => $query->where(fn (Builder $query) => $query->where('subject_label', 'like', "%{$term}%")->orWhere('actor_name', 'like', "%{$term}%")))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('created_at', '<=', $to.' 23:59:59'))
            ->latest('id');
    }
}
