<?php

namespace App\Support\Tracking;

use RuntimeException;

/**
 * An ad platform refused an event (bad token, unknown pixel…); the message is shown to the vendor.
 */
class ConversionFailed extends RuntimeException {}
