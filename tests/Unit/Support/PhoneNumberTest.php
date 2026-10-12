<?php

namespace Tests\Unit\Support;

use App\Support\PhoneNumber;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    #[TestWith(['010 1234-5678', '01012345678'])]
    #[TestWith(['٠١٠١٢٣٤٥٦٧٨', '01012345678'])]
    #[TestWith(['(+966) 501234567', '+966501234567'])]
    public function test_normalizes_spacing_punctuation_and_arabic_digits(string $input, string $expected): void
    {
        $this->assertSame($expected, PhoneNumber::normalize($input));
    }

    #[TestWith(['01012345678', true])]
    #[TestWith(['0501234567', true])]
    #[TestWith(['+201012345678', true])]
    #[TestWith(['01312345678', false])]
    #[TestWith(['0101', false])]
    public function test_validates_supported_formats(string $phone, bool $valid): void
    {
        $this->assertSame($valid, PhoneNumber::isValid($phone));
    }
}
