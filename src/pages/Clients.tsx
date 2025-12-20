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
import { Plus, Search } from 'lucide-react';

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

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadClients();
        loadEmployees();
    }, []);

    // const loadClients = async () => {
    //     setLoading(true);
    //     try {
    //         const { data: clientData, error } = await supabase
    //             .from('clients')
    //             .select(`*, employee_clients!inner(user_id)`);

    //         if (error) throw error;

    //         // Fetch assignments separately to get employee names
    //         const { data: assignments } = await supabase
    //             .from('employee_clients')
    //             .select('client_id, user_id');

    //         const { data: employeeProfiles } = await supabase
    //             .from('profiles')
    //             .select('id, name');

    //         const empMap = new Map(employeeProfiles?.map((e: any) => [e.id, e.name]));

    //         const list = (clientData || []).map((c: any) => {
    //             const assignment = assignments?.find((a: any) => a.client_id === c.id);
    //             return {
    //                 ...c,
    //                 assigned_employee_name: assignment ? empMap.get(assignment.user_id) : undefined,
    //             };
    //         });

    //         setClients(list);
    //     } catch (err) {
    //         console.error('Error loading clients:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const loadClients = async () => {
    setLoading(true);
    try {
        // Fetch all clients (no inner join)
        const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch assignments separately
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
    } finally {
        setLoading(false);
    }
};


    const loadEmployees = async () => {
    try {
        // 1️⃣ Fetch all employee user_ids from user_roles
        const { data: employeeRoles, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'employee');

        if (roleError) throw roleError;

        // 2️⃣ Extract just the user IDs into an array
        const employeeIds = (employeeRoles || []).map(r => r.user_id);

        if (employeeIds.length === 0) {
            setEmployees([]);
            return;
        }

        // 3️⃣ Fetch employee profiles using the array of IDs
        const { data: employeesData, error: empError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', employeeIds);

        if (empError) throw empError;

        setEmployees(employeesData || []);
    } catch (err) {
        console.error('Error loading employees:', err);
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
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={`/clients/${client.id}`}>View</Link>
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={!!client.assigned_employee_name}
                                                onClick={() => openAssignDialog(client)}
                                            >
                                                {client.assigned_employee_name ? 'Assigned' : 'Assign to Employee'}
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
        </div>
    );
}
