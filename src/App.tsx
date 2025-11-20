import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import CreateClient from "./pages/CreateClient";
import Users from "./pages/Users";
import UserDetails from "./pages/UserDetails";
import ClientDetails from "./pages/ClientDetails";
import Payments from "./pages/Payments";
import Audit from "./pages/Audit";
import MyClients from "./pages/MyClients";
import MyHistory from "./pages/MyHistory";
import MyPayments from "./pages/MyPayments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth/login" element={<Auth />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/clients"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <Clients />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <ClientDetails />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <Users />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <UserDetails />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/clients/create"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <CreateClient />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/payments"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <Payments />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <Audit />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-clients"
              element={
                <ProtectedRoute allowedRoles={['employee', 'payer']}>
                  <DashboardLayout>
                    <MyClients />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-history"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <DashboardLayout>
                    <MyHistory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-payments"
              element={
                <ProtectedRoute allowedRoles={['payer']}>
                  <DashboardLayout>
                    <MyPayments />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
