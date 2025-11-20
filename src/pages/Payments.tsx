import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';

export default function Payments() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        setLoading(true);
        try {
            // fetch clients with payment-related statuses
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .in('status', ['initial_payment_pending', 'ics_payment_pending'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (err) {
            console.error('Error loading payments:', err);
        } finally {
            setLoading(false);
        }
    };

    const openApprove = (client: any) => {
        setSelectedClient(client);
        setConfirmOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedClient) return;
        setProcessing(true);
        try {
            const newStatus = selectedClient.status === 'initial_payment_pending' ? 'initial_payment_confirmed' : 'ics_payment_confirmed';
            const { error } = await supabase
                .from('clients')
                .update({ status: newStatus })
                .eq('id', selectedClient.id);

            if (error) throw error;

            // remove approved client from list (since list shows pending)
            setPayments((prev) => prev.filter((p) => p.id !== selectedClient.id));
            toast.success('Payment approved');
            setConfirmOpen(false);
            setSelectedClient(null);
        } catch (err: any) {
            console.error('Approve payment failed:', err);
            toast.error(err?.message || 'Failed to approve payment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Payments</h1>
                <p className="text-muted-foreground mt-1">Pending payments and receipts</p>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No pending payments
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.full_name}</TableCell>
                                    <TableCell>{p.phone}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={p.status as any} />
                                    </TableCell>
                                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={`/clients/${p.id}`}>View</Link>
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => openApprove(p)}>
                                                Approve
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) { setSelectedClient(null); } setConfirmOpen(v); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Payment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve the payment for <strong>{selectedClient?.full_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={processing}>Cancel</Button>
                            <Button onClick={handleApprove} disabled={processing}>{processing ? 'Processing...' : 'Approve'}</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
