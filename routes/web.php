<?php

use Illuminate\Support\Facades\Route;

Route::view('/{any?}', 'app')
    ->where('any', '^(?!api|build|storage).*$')
    ->name('spa');
