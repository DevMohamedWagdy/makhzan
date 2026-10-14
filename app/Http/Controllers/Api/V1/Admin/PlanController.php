<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\SavePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class PlanController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return PlanResource::collection(Plan::query()->ordered()->withCount(['stores' => fn ($query) => $query->where('plan_expires_at', '>', now())])->get());
    }

    public function store(SavePlanRequest $request): PlanResource
    {
        return new PlanResource(Plan::query()->create($request->validated())->refresh());
    }

    public function update(SavePlanRequest $request, Plan $plan): PlanResource
    {
        $plan->update($request->validated());

        return new PlanResource($plan);
    }

    /**
     * Plans that stores pay for (now or in the past) are deactivated instead of deleted.
     */
    public function destroy(Plan $plan): Response
    {
        if ($plan->stores()->exists()) {
            throw ValidationException::withMessages(['plan' => __('billing.plan_in_use')]);
        }

        $plan->delete();

        return response()->noContent();
    }
}
