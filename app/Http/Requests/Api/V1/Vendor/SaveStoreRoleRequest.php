<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Models\StoreRole;
use App\Support\StorePermissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class SaveStoreRoleRequest extends FormRequest
{
    /**
     * Another store's role is reported as missing before validating.
     */
    public function authorize(): bool
    {
        $role = $this->route('role');

        abort_if($role && $role->store_id !== $this->user()->store->id, Response::HTTP_NOT_FOUND);

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var StoreRole|null $role */
        $role = $this->route('role');

        return [
            'name' => ['required', 'string', 'max:60', Rule::unique('store_roles', 'name')->where('store_id', $this->user()->store->id)->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['distinct', Rule::in(StorePermissions::all())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('forms.role_name_required'),
            'name.unique' => __('forms.role_name_taken'),
        ];
    }

    /**
     * Any action implies seeing its section.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        $permissions = $this->validated('permissions');

        foreach ($permissions as $permission) {
            $permissions[] = strtok($permission, '.').'.view';
        }

        return array_values(array_intersect(StorePermissions::all(), array_unique($permissions)));
    }
}
