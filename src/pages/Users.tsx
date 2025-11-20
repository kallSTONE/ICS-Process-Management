import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search } from 'lucide-react';

interface UserRow {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    role?: string | null;
}

export default function Users() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [newRole, setNewRole] = useState<'admin' | 'employee' | 'payer'>('admin');
    const [savingRole, setSavingRole] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const [{ data: profiles, error: pError }, { data: roles, error: rError }] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('user_roles').select('user_id, role'),
            ]);

            if (pError) throw pError;
            if (rError) console.error('user_roles fetch error:', rError);

            const roleMap = new Map<string, string>();
            (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

            const list: UserRow[] = (profiles || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                email: p.email ?? null,
                role: roleMap.get(p.id) ?? null,
            }));

            setUsers(list);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const openChangeRole = (u: UserRow) => {
        setSelectedUser(u);
        setNewRole((u.role as 'admin' | 'employee' | 'payer') ?? 'admin');
        setRoleDialogOpen(true);
    };

    const handleChangeRole = async () => {
        if (!selectedUser) return;
        setSavingRole(true);
        try {
            // remove existing roles for user
            const { error: delError } = await supabase.from('user_roles').delete().eq('user_id', selectedUser.id);
            if (delError) throw delError;

            const { error: insError } = await supabase.from('user_roles').insert({ user_id: selectedUser.id, role: newRole as 'admin' | 'employee' | 'payer' });
            if (insError) throw insError;

            setUsers((prev) => prev.map((p) => (p.id === selectedUser.id ? { ...p, role: newRole } : p)));
            toast.success('Role updated');
            setRoleDialogOpen(false);
            setSelectedUser(null);
        } catch (err: any) {
            console.error('Change role failed:', err);
            toast.error(err?.message || 'Failed to update role');
        } finally {
            setSavingRole(false);
        }
    };

    const filtered = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Users</h1>
                    <p className="text-muted-foreground mt-1">Manage application users</p>
                </div>
                <Button asChild>
                    <Link to="/users/create">
                        <Plus className="mr-2 h-4 w-4" />
                        New User
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by name, email or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell>{u.email ?? '—'}</TableCell>
                                    <TableCell>{u.phone}</TableCell>
                                    <TableCell className="capitalize">{u.role ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={`/users/${u.id}`}>Details</Link>
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => openChangeRole(u)}>Change role</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={roleDialogOpen} onOpenChange={(v) => { if (!v) setSelectedUser(null); setRoleDialogOpen(v); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Role</DialogTitle>
                        <DialogDescription>
                            Change role for <strong>{selectedUser?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                        <label className="block text-sm">Role</label>
                        <select className="w-full p-2 border rounded" value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'employee' | 'payer')}>

                            <option value="admin">admin</option>
                            <option value="employee">employee</option>
                            <option value="payer">payer</option>
                        </select>
                    </div>
                    <DialogFooter>
                        <div className="flex gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setRoleDialogOpen(false)} disabled={savingRole}>Cancel</Button>
                            <Button onClick={handleChangeRole} disabled={savingRole}>{savingRole ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
