import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';

export default function MyClients() {
    const { user, role } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !role) return;
        loadClients();
    }, [user, role]);

    const loadClients = async () => {
        setLoading(true);
        try {
            // Just select all clients, RLS will enforce employee restrictions automatically
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (err) {
            console.error('Error loading my clients:', err);
        } finally {
            setLoading(false);
        }

        
    const { data: assignments } = await supabase
        .from('employee_clients')
        .select('client_id')
        .eq('user_id', user.id);
    console.log("Assignments:", assignments);

    const assignedIds = assignments?.map(a => a.client_id) || [];
    console.log("Assigned IDs:", assignedIds);

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
                <h1 className="text-3xl font-bold text-foreground">My Clients</h1>
                <p className="text-muted-foreground mt-1">Clients assigned to you</p>
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
                        {clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No clients assigned to you
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.full_name}</TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={c.status as any} />
                                    </TableCell>
                                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/clients/${c.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
