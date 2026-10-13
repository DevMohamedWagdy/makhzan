<?php

namespace App\Support\Payments;

use RuntimeException;

/**
 * A callback whose signature doesn't match the store's secret: not from the gateway.
 */
class InvalidCallbackSignature extends RuntimeException {}
