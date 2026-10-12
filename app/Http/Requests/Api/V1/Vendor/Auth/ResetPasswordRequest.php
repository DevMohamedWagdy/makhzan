<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'أدخل كلمة المرور الجديدة',
            'password.min' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.regex' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.confirmed' => 'كلمتا المرور غير متطابقتين',
        ];
    }
}
