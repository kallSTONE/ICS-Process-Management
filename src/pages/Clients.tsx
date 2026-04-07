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
import { StatusBadge } from '@/components/StatusBadge';
import { Eye, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';

interface Client {
    id: string;
    full_name: string;
    phone: string;
    status: string;
    created_at: string;
    application_type: string;
    assigned_employee_name?: string;
}

interface Employee {
    id: string;
    name: string;
}

const APPLICATION_TYPES = ['new_passport', 'renewal', 'replacement', 'other'] as const;

const CLIENT_STATUSES = [
    'initial_payment_pending',
    'initial_payment_confirmed',
    'in_progress',
    'ics_payment_pending',
    'ics_payment_confirmed',
    'pdf_downloaded',
    'pdf_printed',
] as const;

type ApplicationType = (typeof APPLICATION_TYPES)[number];
type ClientStatus = (typeof CLIENT_STATUSES)[number];

interface EditFormState {
    full_name: string;
    phone: string;
    application_type: ApplicationType;
    status: ClientStatus;
}

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState<EditFormState>({
        full_name: '',
        phone: '',
        application_type: APPLICATION_TYPES[0],
        status: CLIENT_STATUSES[0],
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingClient, setDeletingClient] = useState<Client | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadClients();
        loadEmployees();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const { data: clientData, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: assignments } = await supabase
                .from('employee_clients')
                .select('client_id, user_id');

            const { data: employeeProfiles } = await supabase
                .from('profiles')
                .select('id, name');

            const empMap = new Map(employeeProfiles?.map((e: any) => [e.id, e.name]));

            const list = (clientData || []).map((c: any) => {
                const assignment = assignments?.find((a: any) => a.client_id === c.id);
                return {
                    ...c,
                    assigned_employee_name: assignment ? empMap.get(assignment.user_id) : undefined,
                };
            });

            setClients(list);
        } catch (err) {
            console.error('Error loading clients:', err);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };


    const loadEmployees = async () => {
        try {
            const { data: employeeRoles, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'employee');

            if (roleError) throw roleError;

            const employeeIds = (employeeRoles || []).map((r) => r.user_id);

            if (employeeIds.length === 0) {
                setEmployees([]);
                return;
            }

            const { data: employeesData, error: empError } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', employeeIds);

            if (empError) throw empError;

            setEmployees(employeesData || []);
        } catch (err) {
            console.error('Error loading employees:', err);
            toast.error('Failed to load employees');
        }
    };


    const openAssignDialog = (client: Client) => {
        setSelectedClient(client);
        setSelectedEmployeeId(null);
        setAssignDialogOpen(true);
    };

    const handleAssign = async () => {
        if (!selectedClient || !selectedEmployeeId) return;
        setAssigning(true);
        try {
            // Insert into employee_clients
            const { error } = await supabase
                .from('employee_clients')
                .insert({
                    client_id: selectedClient.id,
                    user_id: selectedEmployeeId,
                });

            if (error) throw error;

            const { error: clientAssignError } = await supabase
                .from('clients')
                .update({
                    assigned_employee_id: selectedEmployeeId,
                    assigned_to_employee_at: new Date().toISOString(),
                })
                .eq('id', selectedClient.id);

            if (clientAssignError) throw clientAssignError;

            toast.success('Client assigned successfully');
            setAssignDialogOpen(false);
            setSelectedClient(null);
            setSelectedEmployeeId(null);
            loadClients();
        } catch (err: any) {
            console.error('Assignment failed:', err);
            toast.error(err?.message || 'Failed to assign client');
        } finally {
            setAssigning(false);
        }
    };

    const openEditDialog = (client: Client) => {
        setEditingClient(client);
        setEditForm({
            full_name: client.full_name,
            phone: client.phone,
            application_type: client.application_type as ApplicationType,
            status: client.status as ClientStatus,
        });
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingClient) return;

        const payload = {
            full_name: editForm.full_name.trim(),
            phone: editForm.phone.trim(),
            application_type: editForm.application_type,
            status: editForm.status,
        };

        if (!payload.full_name || !payload.phone) {
            toast.error('Full name and phone are required');
            return;
        }

        setSavingEdit(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update(payload)
                .eq('id', editingClient.id);

            if (error) throw error;

            toast.success('Client updated successfully');
            setEditDialogOpen(false);
            setEditingClient(null);
            await loadClients();
        } catch (err: any) {
            console.error('Client update failed:', err);
            toast.error(err?.message || 'Failed to update client');
        } finally {
            setSavingEdit(false);
        }
    };

    const openDeleteDialog = (client: Client) => {
        setDeletingClient(client);
        setDeleteDialogOpen(true);
    };

    const handleDeleteClient = async () => {
        if (!deletingClient) return;

        setDeleting(true);
        try {
            const { error: assignmentDeleteError } = await supabase
                .from('employee_clients')
                .delete()
                .eq('client_id', deletingClient.id);

            if (assignmentDeleteError) throw assignmentDeleteError;

            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', deletingClient.id);

            if (error) throw error;

            toast.success('Client deleted successfully');
            setDeleteDialogOpen(false);
            setDeletingClient(null);
            await loadClients();
        } catch (err: any) {
            console.error('Client delete failed:', err);
            toast.error(err?.message || 'Failed to delete client');
        } finally {
            setDeleting(false);
        }
    };

    const filteredClients = clients.filter(
        (client) =>
            client.full_name.toLowerCase().includes(search.toLowerCase()) ||
            client.phone.includes(search)
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
                    <h1 className="text-3xl font-bold text-foreground">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage all passport applications</p>
                </div>
                <Button asChild>
                    <Link to="/clients/create">
                        <Plus className="mr-2 h-4 w-4" />
                        New Client
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by name or phone..."
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
                            <TableHead>Phone</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No clients found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.full_name}</TableCell>
                                    <TableCell>{client.phone}</TableCell>
                                    <TableCell className="capitalize">{client.application_type.replace('_', ' ')}</TableCell>
                                    <TableCell><StatusBadge status={client.status as any} /></TableCell>
                                    <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{client.assigned_employee_name ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild title="View details" aria-label="View details">
                                                <Link to={`/clients/${client.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Edit client"
                                                aria-label="Edit client"
                                                onClick={() => openEditDialog(client)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={!!client.assigned_employee_name}
                                                title={client.assigned_employee_name ? 'Already assigned' : 'Assign to employee'}
                                                aria-label={client.assigned_employee_name ? 'Already assigned' : 'Assign to employee'}
                                                onClick={() => openAssignDialog(client)}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Delete client"
                                                aria-label="Delete client"
                                                onClick={() => openDeleteDialog(client)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={assignDialogOpen} onOpenChange={(v) => setAssignDialogOpen(v)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Client</DialogTitle>
                        <DialogDescription>
                            Assign <strong>{selectedClient?.full_name}</strong> to an employee
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                        <label className="block text-sm">Employee</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedEmployeeId ?? ''}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">Select employee</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <DialogFooter>
                        <div className="flex gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
                                Cancel
                            </Button>
                            <Button onClick={handleAssign} disabled={!selectedEmployeeId || assigning}>
                                {assigning ? 'Assigning...' : 'Assign'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                        <DialogDescription>
                            Update details for <strong>{editingClient?.full_name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 mt-2">
                        <div className="space-y-1">
                            <label className="block text-sm">Full name</label>
                            <Input
                                value={editForm.full_name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Client full name"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm">Phone</label>
                            <Input
                                value={editForm.phone}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="Phone number"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm">Application Type</label>
                            <select
                                className="w-full p-2 border rounded bg-background"
                                value={editForm.application_type}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        application_type: e.target.value as ApplicationType,
                                    }))
                                }
                            >
                                {APPLICATION_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm">Status</label>
                            <select
                                className="w-full p-2 border rounded bg-background"
                                value={editForm.status}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        status: e.target.value as ClientStatus,
                                    }))
                                }
                            >
                                {CLIENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <div className="flex gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={savingEdit}>
                                {savingEdit ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Client</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. Are you sure you want to delete <strong>{deletingClient?.full_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <div className="flex gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteClient} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
