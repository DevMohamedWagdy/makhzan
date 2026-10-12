<?php

namespace App\Http\Requests\Api\V1\Affiliate\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAffiliatePasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed', 'different:current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'أدخل كلمة المرور الحالية',
            'current_password.current_password' => 'كلمة المرور الحالية غير صحيحة',
            'password.required' => 'أدخل كلمة المرور الجديدة',
            'password.min' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.regex' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.confirmed' => 'كلمتا المرور غير متطابقتين',
            'password.different' => 'اختر كلمة مرور مختلفة عن الحالية',
        ];
    }
}
