import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Branches from "@/pages/Branches";
import Settings from "@/pages/Settings";
import Sequences from "@/pages/Sequences";
import Customers from "@/pages/Customers";
import Agents from "@/pages/Agents";
import Treasuries from "@/pages/Treasuries";
import BankAccounts from "@/pages/BankAccounts";
import ChargeTypes from "@/pages/ChargeTypes";
import Accounts from "@/pages/Accounts";
import FiscalYears from "@/pages/FiscalYears";
import AuditLogs from "@/pages/AuditLogs";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={32} className="animate-spin" />
          <span className="text-sm">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/roles" component={Roles} />
        <Route path="/branches" component={Branches} />
        <Route path="/settings" component={Settings} />
        <Route path="/sequences" component={Sequences} />
        <Route path="/customers" component={Customers} />
        <Route path="/agents" component={Agents} />
        <Route path="/treasuries" component={Treasuries} />
        <Route path="/bank-accounts" component={BankAccounts} />
        <Route path="/charge-types" component={ChargeTypes} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/fiscal-years" component={FiscalYears} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
