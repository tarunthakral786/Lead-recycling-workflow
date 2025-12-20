import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [user, setUser] = useState({ id: 'preview', name: 'Preview User', email: 'preview@demo.com' });
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={<LoginPage onLogin={handleLogin} />} 
          />
          <Route 
            path="/" 
            element={<DashboardPage user={user} onLogout={handleLogout} />} 
          />
          <Route 
            path="/history" 
            element={<HistoryPage user={user} onLogout={handleLogout} />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;