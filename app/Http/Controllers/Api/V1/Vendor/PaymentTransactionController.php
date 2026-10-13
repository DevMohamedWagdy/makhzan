<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Payments\ListPaymentTransactions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListPaymentTransactionsRequest;
use App\Http\Resources\PaymentTransactionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The store's online payments page: every Paymob payment attempt and refund in one place.
 */
class PaymentTransactionController extends Controller
{
    /** Rows in one spreadsheet export. */
    private const MAX_EXPORT = 5000;

    public function __construct(private ListPaymentTransactions $transactions) {}

    public function index(ListPaymentTransactionsRequest $request): AnonymousResourceCollection
    {
        $page = $this->transactions->query($request->user()->store, $request->validated())
            ->paginate($request->validated('per_page') ?? 20)
            ->withQueryString();

        return PaymentTransactionResource::collection($page);
    }

    public function summary(ListPaymentTransactionsRequest $request): JsonResponse
    {
        return response()->json($this->transactions->summary($request->user()->store, $request->validated()));
    }

    /**
     * The filtered list without paging, for the spreadsheet export.
     */
    public function export(ListPaymentTransactionsRequest $request): JsonResponse
    {
        $rows = $this->transactions->query($request->user()->store, $request->validated())->limit(self::MAX_EXPORT)->get();

        return response()->json(['data' => PaymentTransactionResource::collection($rows)]);
    }
}
