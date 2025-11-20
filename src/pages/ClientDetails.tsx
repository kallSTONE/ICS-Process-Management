import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';

export default function ClientDetails() {
    const { id } = useParams();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        load();
    }, [id]);

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            setClient(data ?? data);
        } catch (err) {
            console.error('Error loading client details:', err);
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

    if (!client) {
        return (
            <div>
                <p className="text-muted-foreground">Client not found</p>
                <Button asChild>
                    <Link to="/clients">Back to clients</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{client.full_name}</h1>
                    <p className="text-muted-foreground">Client details</p>
                </div>
                <Button asChild>
                    <Link to="/clients">Back</Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="text-sm text-muted-foreground">Full name</h3>
                    <div className="font-medium">{client.full_name}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Phone</h3>
                    <div className="font-medium">{client.phone}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Email</h3>
                    <div className="font-medium">{client.email ?? '—'}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Application type</h3>
                    <div className="font-medium capitalize">{(client.application_type || '').replace('_', ' ')}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Status</h3>
                    <div className="font-medium"><StatusBadge status={client.status as any} /></div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Created</h3>
                    <div className="font-medium">{new Date(client.created_at).toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
