<?php

namespace App\Policies;

use App\Models\SupportTicket;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

/**
 * The merchant's side of support tickets. Owners hold every permission; staff need
 * "support.view" to read the store's tickets and "support.create" to open or reply to them.
 * The platform team is checked by the admin.can middleware instead.
 */
class SupportTicketPolicy
{
    public function viewAny(Vendor $vendor): Response
    {
        return $vendor->hasPermission('support.view') ? Response::allow() : Response::deny(__('auth.staff_forbidden'));
    }

    public function create(Vendor $vendor): Response
    {
        return $vendor->hasPermission('support.create') ? Response::allow() : Response::deny(__('auth.staff_forbidden'));
    }

    /**
     * Another store's ticket is reported as missing (404).
     */
    public function view(Vendor $vendor, SupportTicket $ticket): Response
    {
        if ($vendor->store?->id !== $ticket->store_id) {
            return Response::denyAsNotFound(__('support.not_found'));
        }

        return $this->viewAny($vendor);
    }

    public function reply(Vendor $vendor, SupportTicket $ticket): Response
    {
        $view = $this->view($vendor, $ticket);

        return $view->allowed() ? $this->create($vendor) : $view;
    }
}
