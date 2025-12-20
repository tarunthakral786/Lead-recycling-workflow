import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RefiningPage from "@/pages/RefiningPage";
import RecyclingPage from "@/pages/RecyclingPage";
import DrossRecyclingPage from "@/pages/DrossRecyclingPage";
import DrossRecyclingEntryPage from "@/pages/DrossRecyclingEntryPage";
import ControlPanelPage from "@/pages/ControlPanelPage";
import HistoryPage from "@/pages/HistoryPage";
import SalesPage from "@/pages/SalesPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-2xl font-bold text-slate-700">Loading...</div>
    </div>;
  }

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/" 
            element={user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/refining" 
            element={user ? <RefiningPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recycling" 
            element={user ? <RecyclingPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/dross-recycling" 
            element={user ? <DrossRecyclingPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/dross-recycling/add" 
            element={user ? <DrossRecyclingEntryPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/history" 
            element={user ? <HistoryPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales" 
            element={user ? <SalesPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;