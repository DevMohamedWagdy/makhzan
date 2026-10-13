import { Badge } from '@/components/ui/Display';
import { PURCHASE_ORDER_STATUSES } from '@/lib/constants';

export function PurchaseOrderStatusBadge({ status }) {
    const config = PURCHASE_ORDER_STATUSES[status];

    return (
        <Badge tone={config.tone} icon={config.icon}>
            {config.label}
        </Badge>
    );
}
