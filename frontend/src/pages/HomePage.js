import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Recycle, FlaskConical, History, TrendingUp, DollarSign, Settings, ShoppingCart } from 'lucide-react';

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
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/spes-logo.png" alt="SPES PRO" className="h-14 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900" data-testid="home-title">SPES PRO</h1>
              <p className="text-base text-slate-600">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {user.name === 'TT' && (
              <Button
                onClick={() => navigate('/control-panel')}
                data-testid="control-panel-button"
                className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
              >
                <Settings className="w-5 h-5 mr-2" />
                Control Panel
              </Button>
            )}
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
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-bold text-slate-500 uppercase">Pure Lead</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" data-testid="pure-lead-stat">
              {loading ? '...' : `${stats?.total_pure_lead_manufactured || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="w-6 h-6 text-amber-600" />
              <span className="text-xs font-bold text-slate-500 uppercase">Total Dross</span>
            </div>
            <p className="text-2xl font-bold text-amber-700" data-testid="dross-stat">
              {loading ? '...' : `${stats?.total_dross || 0} kg`}
            </p>
          </Card>

          <Card className="bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-6 h-6 text-yellow-700" />
              <span className="text-xs font-bold text-yellow-700 uppercase">High Lead</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800" data-testid="high-lead-stat">
              {loading ? '...' : `${stats?.total_high_lead || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-bold text-slate-500 uppercase">Remelted</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" data-testid="remelted-stat">
              {loading ? '...' : `${stats?.total_remelted_lead || 0} kg`}
            </p>
          </Card>

          <Card className="bg-purple-50 border-2 border-purple-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <span className="text-xs font-bold text-purple-600 uppercase">RML Purchased</span>
            </div>
            <p className="text-2xl font-bold text-purple-700" data-testid="rml-purchased-stat">
              {loading ? '...' : `${stats?.total_rml_purchased || 0} kg`}
            </p>
          </Card>

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="w-6 h-6 text-teal-600" />
              <span className="text-xs font-bold text-slate-500 uppercase">In Stock</span>
            </div>
            <p className="text-2xl font-bold text-teal-700" data-testid="remelted-stock-stat">
              {loading ? '...' : `${stats?.remelted_lead_in_stock || 0} kg`}
            </p>
          </Card>

          {user.name === 'TT' && (
            <Card className="bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-bold text-blue-600 uppercase">Receivable</span>
              </div>
              <p className="text-2xl font-bold text-blue-700" data-testid="receivable-stat">
                {loading ? '...' : `${stats?.total_receivable || 0} kg`}
              </p>
            </Card>
          )}

          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <span className="text-xs font-bold text-slate-500 uppercase">Available</span>
            </div>
            <p className="text-2xl font-bold text-green-600" data-testid="available-stat">
              {loading ? '...' : `${stats?.available_stock || 0} kg`}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/refining')}
            data-testid="refining-option"
          >
            <FlaskConical className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">REFINING</h2>
            <p className="text-base text-orange-50">Process lead ingots into pure lead</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/recycling')}
            data-testid="recycling-option"
          >
            <Recycle className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">RECYCLING</h2>
            <p className="text-base text-green-50">Process batteries into remelted lead</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/dross-recycling')}
            data-testid="dross-recycling-option"
          >
            <Recycle className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">DROSS RECYCLING</h2>
            <p className="text-base text-amber-50">Process dross into HIGH LEAD</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/rml-purchases')}
            data-testid="rml-purchases-option"
          >
            <ShoppingCart className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">RML PURCHASES</h2>
            <p className="text-base text-purple-50">Purchase remelted lead inventory</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/sales')}
            data-testid="sales-button"
            className="h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <DollarSign className="w-6 h-6 mr-3" />
            Record Sale
          </Button>

          <Button
            onClick={() => navigate('/history')}
            data-testid="history-button"
            className="h-16 text-xl font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-lg rounded-lg"
          >
            <History className="w-6 h-6 mr-3" />
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}
