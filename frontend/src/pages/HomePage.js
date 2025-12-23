import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Recycle, FlaskConical, History, DollarSign, Settings, ShoppingCart, Atom, Package } from 'lucide-react';

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
              <h1 className="text-3xl font-bold text-slate-900">SPES PRO</h1>
              <p className="text-base text-slate-600">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {user.name === 'TT' && (
              <Button
                onClick={() => navigate('/control-panel')}
                className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
              >
                <Settings className="w-5 h-5 mr-2" />
                Control Panel
              </Button>
            )}
            <Button
              onClick={onLogout}
              className="h-12 px-6 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Dashboard Stats - 6 key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Pure Lead */}
          <Card className="bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase">Pure Lead</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {loading ? '...' : `${stats?.pure_lead_stock || 0} kg`}
            </p>
          </Card>

          {/* RML Purchases Stock */}
          <Card className="bg-purple-50 border-2 border-purple-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <span className="text-xs font-bold text-purple-600 uppercase">RML Stock</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {loading ? '...' : `${stats?.rml_stock || 0} kg`}
            </p>
          </Card>

          {/* Lead Receivable from Battery Recycling */}
          <Card className="bg-green-50 border-2 border-green-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-bold text-green-600 uppercase">Receivable</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {loading ? '...' : `${stats?.total_receivable || 0} kg`}
            </p>
          </Card>

          {/* High Lead from Dross */}
          <Card className="bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-6 h-6 text-yellow-700" />
              <span className="text-xs font-bold text-yellow-700 uppercase">High Lead</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800">
              {loading ? '...' : `${stats?.high_lead_stock || 0} kg`}
            </p>
          </Card>

          {/* Total Dross */}
          <Card className="bg-amber-50 border-2 border-amber-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="w-6 h-6 text-amber-600" />
              <span className="text-xs font-bold text-amber-600 uppercase">Total Dross</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {loading ? '...' : `${stats?.total_dross || 0} kg`}
            </p>
          </Card>

          {/* Antimony Recoverable */}
          <Card className="bg-cyan-50 border-2 border-cyan-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Atom className="w-6 h-6 text-cyan-700" />
              <span className="text-xs font-bold text-cyan-700 uppercase">Antimony</span>
            </div>
            <p className="text-2xl font-bold text-cyan-800">
              {loading ? '...' : `${stats?.antimony_recoverable || 0} kg`}
            </p>
          </Card>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/refining')}
          >
            <FlaskConical className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">REFINING</h2>
            <p className="text-base text-orange-50">Process lead ingots into pure lead</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/recycling')}
          >
            <Recycle className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">RECYCLING</h2>
            <p className="text-base text-green-50">Track battery recycling receivables</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/dross-recycling')}
          >
            <Recycle className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">DROSS RECYCLING</h2>
            <p className="text-base text-amber-50">Process dross into HIGH LEAD</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/rml-purchases')}
          >
            <ShoppingCart className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">RML PURCHASES</h2>
            <p className="text-base text-purple-50">Purchase remelted lead inventory</p>
          </Card>

          <Card
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95"
            onClick={() => navigate('/rml-received-santosh')}
          >
            <Package className="w-12 h-12 text-white mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">RML RECEIVED SANTOSH</h2>
            <p className="text-base text-green-50">Receive RML from recycling receivable</p>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/sales')}
            className="h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <DollarSign className="w-6 h-6 mr-3" />
            Record Sale
          </Button>

          <Button
            onClick={() => navigate('/history')}
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
