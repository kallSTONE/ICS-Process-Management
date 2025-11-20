import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingPayments: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prevent calling loadStats before user + role are ready
    if (!user || !role) return;

    loadStats();
  }, [role, user]);

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

        setStats({
          totalClients: totalClients || 0,
          pendingPayments: pendingPayments || 0,
          inProgress: inProgress || 0,
          completed: completed || 0,
        });
      } else if (role === 'employee') {
        const { count: totalClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_employee_id', user?.id)
          .not('status', 'in', '(ics_payment_confirmed,pdf_downloaded,pdf_printed)');

        const { count: inProgress } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_employee_id', user?.id)
          .eq('status', 'in_progress');

        setStats({
          totalClients: totalClients || 0,
          pendingPayments: 0,
          inProgress: inProgress || 0,
          completed: 0,
        });
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
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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
    </div>
  );
}
