import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Recycle, FlaskConical, History, TrendingUp, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage({ user, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="home-title">LeadTrack Pro</h1>
            <p className="text-base text-slate-600">Welcome, {user.name}</p>
          </div>
          <Button
            onClick={onLogout}
            data-testid="logout-button"
            className="h-12 px-6 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <FlaskConical className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-bold text-slate-500 uppercase">Pure Lead</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" data-testid="pure-lead-stat">
              {loading ? '...' : `${stats?.total_pure_lead_manufactured || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Recycle className="w-8 h-8 text-green-600" />
              <span className="text-sm font-bold text-slate-500 uppercase">Remelted</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" data-testid="remelted-stat">
              {loading ? '...' : `${stats?.total_remelted_lead || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-bold text-slate-500 uppercase">Sold</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" data-testid="sold-stat">
              {loading ? '...' : `${stats?.total_sold || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-sm font-bold text-slate-500 uppercase">Available</span>
            </div>
            <p className="text-3xl font-bold text-green-600" data-testid="available-stat">
              {loading ? '...' : `${stats?.available_stock || 0} kg`}
            </p>
          </Card>
        </div>

        {/* Main Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/refining')}
            data-testid="refining-option"
          >
            <FlaskConical className="w-16 h-16 text-white mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">REFINING</h2>
            <p className="text-xl text-orange-50">Process lead ingots into pure lead</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/recycling')}
            data-testid="recycling-option"
          >
            <Recycle className="w-16 h-16 text-white mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">RECYCLING</h2>
            <p className="text-xl text-green-50">Process batteries into remelted lead</p>
          </Card>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/sales')}
            data-testid="sales-button"
            className="h-20 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <DollarSign className="w-6 h-6 mr-3" />
            Record Sale
          </Button>

          <Button
            onClick={() => navigate('/history')}
            data-testid="history-button"
            className="h-20 text-xl font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-lg rounded-lg"
          >
            <History className="w-6 h-6 mr-3" />
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}