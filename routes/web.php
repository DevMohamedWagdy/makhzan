<?php

use App\Http\Controllers\SpaController;
use App\Http\Middleware\ResolveStoreDomain;
use Illuminate\Support\Facades\Route;

Route::get('/{any?}', SpaController::class)
    ->middleware(ResolveStoreDomain::class)
    ->where('any', '^(?!api|build|storage).*$')
    ->name('spa');
