<?php

namespace App\Support\Payments;

use RuntimeException;

/**
 * The gateway refused a request or couldn't be reached.
 */
class PaymentGatewayException extends RuntimeException {}
