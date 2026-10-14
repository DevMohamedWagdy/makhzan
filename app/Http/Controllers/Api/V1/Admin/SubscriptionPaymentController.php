<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionPaymentResource;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubscriptionPaymentController extends Controller
{
    /**
     * Every recorded subscription payment, newest first.
     */
    public function index(): AnonymousResourceCollection
    {
        return SubscriptionPaymentResource::collection(SubscriptionPayment::query()->with(['store', 'recorder'])->latest('id')->paginate(30));
    }
}
