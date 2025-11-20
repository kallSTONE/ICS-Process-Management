import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MyHistory() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        load();
    }, [user]);

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('id, user_id, client_id, action, details, created_at')
                .or(`user_id.eq.${user?.id},visible_to_roles.cs.{admin,employee,payer}`)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoading(false);
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
                <h1 className="text-3xl font-bold text-foreground">My History</h1>
                <p className="text-muted-foreground mt-1">Recent activity related to you</p>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No history
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell className="font-medium">{l.action}</TableCell>
                                    <TableCell>{l.client_id ?? '—'}</TableCell>
                                    <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                                    <TableCell className="max-w-xs truncate">{JSON.stringify(l.details)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
