import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Banknote, CircleDollarSign, ReceiptText } from 'lucide-react';

const APPLICATION_FEES: Record<string, number> = {
    new_passport: 6000,
    renewal: 26000,
    replacement: 26000,
    other: 0,
};

const BUSINESS_FEE_PER_APPLICATION = 1000;

const COLLECTED_STATUSES = [
    'initial_payment_confirmed',
    'in_progress',
    'ics_payment_pending',
    'ics_payment_confirmed',
    'pdf_downloaded',
    'pdf_printed',
];

const money = (value: number) => new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
}).format(value);

function normalizeType(value: string | null | undefined) {
    return (value || 'other').toLowerCase();
}

export default function Payments() {
    const [payments, setPayments] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState({
        totalCollected: 0,
        businessEarnings: 0,
        confirmedApplications: 0,
        pendingPayments: 0,
        newPassportCount: 0,
        renewalCount: 0,
        replacementCount: 0,
        newPassportTotal: 0,
        renewalTotal: 0,
        replacementTotal: 0,
    });
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
            // fetch clients with payment-related statuses for the table
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .in('status', ['initial_payment_pending', 'ics_payment_pending'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);

            const { data: analyticsData, error: analyticsError } = await supabase
                .from('clients')
                .select('application_type, status')
                .in('status', COLLECTED_STATUSES.concat(['initial_payment_pending', 'ics_payment_pending']));

            if (analyticsError) throw analyticsError;

            const rows = analyticsData || [];
            const collected = rows.filter((row: any) => COLLECTED_STATUSES.includes(row.status));

            const grouped = collected.reduce(
                (acc: any, row: any) => {
                    const type = normalizeType(row.application_type);
                    const fee = APPLICATION_FEES[type] ?? 0;

                    acc.totalCollected += fee;
                    acc.businessEarnings += BUSINESS_FEE_PER_APPLICATION;
                    acc.confirmedApplications += 1;

                    if (type === 'new_passport') {
                        acc.newPassportCount += 1;
                        acc.newPassportTotal += fee;
                    } else if (type === 'renewal') {
                        acc.renewalCount += 1;
                        acc.renewalTotal += fee;
                    } else if (type === 'replacement') {
                        acc.replacementCount += 1;
                        acc.replacementTotal += fee;
                    }

                    return acc;
                },
                {
                    totalCollected: 0,
                    businessEarnings: 0,
                    confirmedApplications: 0,
                    newPassportCount: 0,
                    renewalCount: 0,
                    replacementCount: 0,
                    newPassportTotal: 0,
                    renewalTotal: 0,
                    replacementTotal: 0,
                }
            );

            setAnalytics({
                ...grouped,
                pendingPayments: rows.filter((row: any) => row.status === 'initial_payment_pending' || row.status === 'ics_payment_pending').length,
            });
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{money(analytics.totalCollected)}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Across confirmed applications</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Business Earnings</CardTitle>
                        <Banknote className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{money(analytics.businessEarnings)}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{analytics.confirmedApplications} confirmed × {money(BUSINESS_FEE_PER_APPLICATION)}</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                        <ReceiptText className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{analytics.pendingPayments}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed Applications</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{analytics.confirmedApplications}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Ready for next workflow stage</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">New Passport</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Applications</span>
                            <span className="font-medium">{analytics.newPassportCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Collected</span>
                            <span className="font-medium">{money(analytics.newPassportTotal)}</span>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{money(6000)} each</Badge>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Renewal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Applications</span>
                            <span className="font-medium">{analytics.renewalCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Collected</span>
                            <span className="font-medium">{money(analytics.renewalTotal)}</span>
                        </div>
                        <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">{money(26000)} each</Badge>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Replacement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Applications</span>
                            <span className="font-medium">{analytics.replacementCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Collected</span>
                            <span className="font-medium">{money(analytics.replacementTotal)}</span>
                        </div>
                        <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{money(26000)} each</Badge>
                    </CardContent>
                </Card>
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
