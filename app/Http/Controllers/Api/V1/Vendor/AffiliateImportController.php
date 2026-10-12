<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Affiliates\ImportAffiliates;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ImportAffiliatesRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AffiliateImportController extends Controller
{
    /**
     * Bulk import from a CSV upload or pre-parsed rows. Valid rows are imported;
     * invalid ones are skipped and reported with their line numbers.
     */
    public function __invoke(ImportAffiliatesRequest $request, ImportAffiliates $importAffiliates): JsonResponse
    {
        $rows = $request->hasFile('file')
            ? $importAffiliates->rowsFromCsv($request->file('file'))
            : $request->validated('rows');

        $maxRows = config('makhzan.affiliates.import_max_rows');

        if ($rows === [] || count($rows) > $maxRows) {
            throw ValidationException::withMessages([
                'file' => $rows === [] ? 'الملف فارغ أو لا يحتوي على صفوف بيانات' : "الحد الأقصى {$maxRows} صف في المرة الواحدة",
            ]);
        }

        return response()->json($importAffiliates->handle($request->user()->store, $rows));
    }
}
