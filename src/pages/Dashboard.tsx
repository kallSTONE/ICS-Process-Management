import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { FileText, Users, DollarSign, Clock } from 'lucide-react';

interface UnassignedClient {
  id: string;
  full_name: string;
  phone: string;
  status: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
}

export default function Dashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingPayments: 0,
    inProgress: 0,
    completed: 0,
  });
  const [unassignedClients, setUnassignedClients] = useState<UnassignedClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<UnassignedClient | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prevent calling loadStats before user + role are ready
    if (!user || !role) return;

    loadStats();
    if (role === 'admin') {
      loadEmployees();
    }
  }, [role, user]);

  const loadEmployees = async () => {
    try {
      const { data: employeeRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'employee');

      if (roleError) throw roleError;

      const employeeIds = (employeeRoles || []).map((r: any) => r.user_id);

      if (employeeIds.length === 0) {
        setEmployees([]);
        return;
      }

      const { data: employeeProfiles, error: empError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', employeeIds);

      if (empError) throw empError;

      setEmployees(employeeProfiles || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const openAssignDialog = (client: UnassignedClient) => {
    setSelectedClient(client);
    setSelectedEmployeeId('');
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedClient || !selectedEmployeeId) return;

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('employee_clients')
        .insert({ client_id: selectedClient.id, user_id: selectedEmployeeId });

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
      setSelectedEmployeeId('');
      await loadStats();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast.error(error?.message || 'Failed to assign client');
    } finally {
      setAssigning(false);
    }
  };

  const loadStats = async () => {
    if (!role) return;  // Prevent undefined role crash

    try {
      if (role === 'admin') {
        const { count: totalClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        const { count: pendingPayments } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .in('status', ['initial_payment_pending', 'ics_payment_pending']);

        const { count: inProgress } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress');

        const { count: completed } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pdf_printed');

        const { data: allClients } = await supabase
          .from('clients')
          .select('id, full_name, phone, status, created_at')
          .order('created_at', { ascending: false });

        const { data: assignments } = await supabase
          .from('employee_clients')
          .select('client_id');

        const assignedClientIds = new Set((assignments || []).map((a: any) => a.client_id));
        const unassigned = (allClients || []).filter((client: any) => !assignedClientIds.has(client.id));

        setStats({
          totalClients: totalClients || 0,
          pendingPayments: pendingPayments || 0,
          inProgress: inProgress || 0,
          completed: completed || 0,
        });
        setUnassignedClients(unassigned);
      } else if (role === 'employee') {
        // Employees assignments are stored in `employee_clients` (not the
        // `assigned_employee_id` column). Count by looking up assignments,
        // then counting clients that match those IDs. This prevents counts
        // from being zero when assignment is stored separately.
        const { data: assignments } = await supabase
          .from('employee_clients')
          .select('client_id')
          .eq('user_id', user?.id);

        const assignedIds = (assignments || []).map((a: any) => a.client_id).filter(Boolean);

        if (assignedIds.length === 0) {
          setStats({ totalClients: 0, pendingPayments: 0, inProgress: 0, completed: 0 });
          setUnassignedClients([]);
        } else {
          const { count: totalClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .in('id', assignedIds)
            .not('status', 'in', '(ics_payment_confirmed,pdf_downloaded,pdf_printed)');

          const { count: inProgress } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .in('id', assignedIds)
            .eq('status', 'in_progress');

          setStats({
            totalClients: totalClients || 0,
            pendingPayments: 0,
            inProgress: inProgress || 0,
            completed: 0,
          });
          setUnassignedClients([]);
        }
      } else if (role === 'payer') {
        const { count: totalClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_payer_id', user?.id);

        const { count: pendingPayments } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_payer_id', user?.id)
          .eq('status', 'ics_payment_pending');

        setStats({
          totalClients: totalClients || 0,
          pendingPayments: pendingPayments || 0,
          inProgress: 0,
          completed: 0,
        });
        setUnassignedClients([]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setUnassignedClients([]);
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
        {role === 'admin' && (<h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>)}
        {role === 'payer' && (<h1 className="text-3xl font-bold text-foreground">Payer Dashboard</h1>)}
        {role === 'employee' && (<h1 className="text-3xl font-bold text-foreground">Employee Dashboard</h1>)}

        <p className="text-muted-foreground mt-1">
          Welcome back! Here's an overview of your activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {role === 'admin' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Users className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
          </>
        )}

        {role === 'employee' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
              </CardContent>
            </Card>
          </>
        )}

        {role === 'payer' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">All clients are currently assigned to an employee.</p>
            ) : (
              <div className="rounded-md border">
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
                    {unassignedClients.slice(0, 8).map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.full_name}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell><StatusBadge status={client.status as any} /></TableCell>
                        <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openAssignDialog(client)}>
                              Assign to Employee
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/clients/${client.id}`}>View</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {unassignedClients.length > 8 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing 8 of {unassignedClients.length} unassigned clients.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={(open) => setAssignDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Client</DialogTitle>
            <DialogDescription>
              Assign <strong>{selectedClient?.full_name}</strong> to an employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm">Employee</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedEmployeeId || assigning}>
              {assigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
