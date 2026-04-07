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
  { label: string; className: string }
> = {
  initial_payment_pending: {
    label: 'Payment Pending',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  initial_payment_confirmed: {
    label: 'Payment Confirmed',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  in_progress: {
    label: 'In Progress',
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  ics_payment_pending: {
    label: 'ICS Payment Pending',
    className: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  ics_payment_confirmed: {
    label: 'ICS Confirmed',
    className: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  pdf_downloaded: {
    label: 'PDF Downloaded',
    className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  pdf_printed: {
    label: 'Completed',
    className: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
