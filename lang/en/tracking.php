<?php

return [

    'providers' => [
        'meta' => 'Meta',
        'tiktok' => 'TikTok',
        'google' => 'Google Analytics',
    ],
    'unreachable' => "Couldn't reach the platform; we'll try again with the next order",
    'rejected' => ':provider rejected the event: :message',
    'pixel_id_invalid' => "This ID doesn't look right for this platform",

];
