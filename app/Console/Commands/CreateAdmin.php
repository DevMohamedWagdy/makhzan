<?php

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

#[Signature('makhzan:create-admin {--name= : Full name} {--email= : Sign-in email} {--password= : At least 10 characters (asked for when omitted)}')]
#[Description('Create a super admin for the /admin panel, or reset an existing admin\'s password')]
class CreateAdmin extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = Str::lower(trim((string) ($this->option('email') ?: $this->ask('Email'))));
        $name = (string) ($this->option('name') ?: $this->ask('Full name', 'Makhzan Admin'));
        $password = (string) ($this->option('password') ?: $this->secret('Password (10+ characters)'));

        $validator = Validator::make(compact('email', 'name', 'password'), [
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:10'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $admin = Admin::query()->updateOrCreate(['email' => $email], ['full_name' => $name, 'password' => $password, 'is_super' => true, 'is_active' => true]);
        $admin->tokens()->delete();

        $this->info($admin->wasRecentlyCreated ? "Admin {$email} created." : "Admin {$email} updated and signed out everywhere.");

        return self::SUCCESS;
    }
}
