import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import Overview from "@/pages/Overview";
import Architecture from "@/pages/Architecture";
import DomainModel from "@/pages/DomainModel";
import DatabasePage from "@/pages/Database";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import PostingRules from "@/pages/PostingRules";
import InvoiceLifecycle from "@/pages/InvoiceLifecycle";
import ApiOutline from "@/pages/ApiOutline";
import Risks from "@/pages/Risks";
import Roadmap from "@/pages/Roadmap";

const queryClient = new QueryClient();

function Router({ darkMode, toggleDark }: { darkMode: boolean; toggleDark: () => void }) {
  return (
    <Layout darkMode={darkMode} toggleDark={toggleDark}>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/architecture" component={Architecture} />
        <Route path="/domain" component={DomainModel} />
        <Route path="/database" component={DatabasePage} />
        <Route path="/chart-of-accounts" component={ChartOfAccounts} />
        <Route path="/posting-rules" component={PostingRules} />
        <Route path="/invoice-lifecycle" component={InvoiceLifecycle} />
        <Route path="/api" component={ApiOutline} />
        <Route path="/risks" component={Risks} />
        <Route path="/roadmap" component={Roadmap} />
        <Route>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">الصفحة غير موجودة</p>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router darkMode={darkMode} toggleDark={() => setDarkMode(!darkMode)} />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
