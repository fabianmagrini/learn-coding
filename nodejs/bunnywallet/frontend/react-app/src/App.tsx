import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { Admin } from '@/pages/Admin';
import { AccountDetails } from '@/pages/AccountDetails';
import { Wallet, Settings } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                <span className="text-xl font-bold">BunnyWallet</span>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  <Wallet className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/account/:accountId" element={<AccountDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
