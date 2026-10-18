<?php

namespace App\Http\Controllers;

use App\Support\PageMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Illuminate\View\View as ViewResponse;

/**
 * Serves the React app shell for every non-API URL, with page meta tags filled in on the
 * server so shared store and product links preview correctly.
 */
class SpaController extends Controller
{
    public function __invoke(Request $request, PageMeta $pageMeta): ViewResponse
    {
        return view('app', [
            'meta' => $pageMeta->forPath($request->path(), View::shared('storeDomainSlug')),
        ]);
    }
}
