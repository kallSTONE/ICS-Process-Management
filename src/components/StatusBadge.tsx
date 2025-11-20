import { Badge } from '@/components/ui/badge';

type ClientStatus =
  | 'initial_payment_pending'
  | 'initial_payment_confirmed'
  | 'in_progress'
  | 'ics_payment_pending'
  | 'ics_payment_confirmed'
  | 'pdf_downloaded'
  | 'pdf_printed';

interface StatusBadgeProps {
  status: ClientStatus;
}

const statusConfig: Record<
  ClientStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  initial_payment_pending: { label: 'Payment Pending', variant: 'destructive' },
  initial_payment_confirmed: { label: 'Payment Confirmed', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'default' },
  ics_payment_pending: { label: 'ICS Payment Pending', variant: 'destructive' },
  ics_payment_confirmed: { label: 'ICS Confirmed', variant: 'default' },
  pdf_downloaded: { label: 'PDF Downloaded', variant: 'secondary' },
  pdf_printed: { label: 'Completed', variant: 'outline' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
