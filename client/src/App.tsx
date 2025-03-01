import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Router />
        <footer>
          <p>Powered by <a href="https://runthebusiness.substack.com" target="_blank" rel="noopener noreferrer">Run The Business</a></p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;