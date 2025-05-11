import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SavedPlan from "@/pages/saved-plan";
import { AuthProvider } from "./contexts/auth-context";
import AuthForm from "./components/auth/auth-form";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/saved-plans/:id" component={SavedPlan} />
          <Route path="/login" component={() => <AuthForm mode="login" />} />
          <Route path="/register" component={() => <AuthForm mode="register" />} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
