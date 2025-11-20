import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function UserDetails() {
    const { id } = useParams();
    const [profile, setProfile] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        load();
    }, [id]);

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', id).single(),
                supabase.from('user_roles').select('role').eq('user_id', id).maybeSingle(),
            ]);

            if (pErr) throw pErr;
            if (rErr) console.error('role fetch error:', rErr);

            // setProfile(profiles?.data ?? profiles);
            // const r = (roles && (roles.role ?? roles.data?.role)) ?? null;
            // setRole(r);
        } catch (err) {
            console.error('Error loading user details:', err);
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

    if (!profile) {
        return (
            <div>
                <p className="text-muted-foreground">User not found</p>
                <Button asChild>
                    <Link to="/users">Back to users</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <p className="text-muted-foreground">User details</p>
                </div>
                <Button asChild>
                    <Link to="/users">Back</Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="text-sm text-muted-foreground">Name</h3>
                    <div className="font-medium">{profile.name}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Phone</h3>
                    <div className="font-medium">{profile.phone}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Role</h3>
                    <div className="font-medium capitalize">{role ?? '—'}</div>
                </div>

                <div>
                    <h3 className="text-sm text-muted-foreground">Created</h3>
                    <div className="font-medium">{new Date(profile.created_at).toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
