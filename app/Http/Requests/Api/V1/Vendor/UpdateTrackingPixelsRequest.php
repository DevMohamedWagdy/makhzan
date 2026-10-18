<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\TrackingProvider;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateTrackingPixelsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Trim IDs and upper-case TikTok / Google ones, which are pasted with stray spaces or in lower case.
     */
    protected function prepareForValidation(): void
    {
        $pixels = collect((array) $this->input('pixels'))->map(function (mixed $pixel, string $provider): mixed {
            if (! is_array($pixel) || ! is_string($pixel['pixel_id'] ?? null)) {
                return $pixel;
            }

            $pixelId = trim($pixel['pixel_id']);

            return [...$pixel, 'pixel_id' => $provider === TrackingProvider::Meta->value ? $pixelId : strtoupper($pixelId)];
        });

        $this->merge(['pixels' => $pixels->all()]);
    }

    /**
     * One entry per platform; an empty pixel ID disconnects it. A blank access token keeps
     * the saved one.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $providers = implode(',', array_column(TrackingProvider::cases(), 'value'));

        return [
            'pixels' => ['required', "array:{$providers}"],
            'pixels.*' => ['array:pixel_id,access_token,test_event_code,is_active'],
            'pixels.*.pixel_id' => ['nullable', 'string', 'max:64'],
            'pixels.*.access_token' => ['nullable', 'string', 'max:500'],
            'pixels.*.test_event_code' => ['nullable', 'string', 'max:64'],
            'pixels.*.is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach ((array) $this->input('pixels') as $provider => $pixel) {
                    $type = TrackingProvider::tryFrom((string) $provider);
                    $pixelId = $pixel['pixel_id'] ?? null;

                    if ($type && filled($pixelId) && ! preg_match($type->idPattern(), $pixelId)) {
                        $validator->errors()->add("pixels.{$provider}.pixel_id", __('tracking.pixel_id_invalid'));
                    }
                }
            },
        ];
    }
}
