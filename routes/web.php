<?php

use App\Http\Middleware\ResolveStoreDomain;
use Illuminate\Support\Facades\Route;

Route::view('/{any?}', 'app')
    ->middleware(ResolveStoreDomain::class)
    ->where('any', '^(?!api|build|storage).*$')
    ->name('spa');
