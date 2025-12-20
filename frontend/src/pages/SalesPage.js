import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SalesPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    party_name: '',
    quantity_kg: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/sales`, {
        party_name: formData.party_name,
        quantity_kg: parseFloat(formData.quantity_kg)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Sale recorded successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="sales-title">Record Sale</h1>
              <p className="text-base text-slate-600">Track lead product sales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="party_name" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                Party Name
              </Label>
              <Input
                id="party_name"
                data-testid="party-name-input"
                type="text"
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                placeholder="Enter party name"
                required
              />
            </div>

            <div>
              <Label htmlFor="quantity" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quantity Sold (KG)
              </Label>
              <Input
                id="quantity"
                data-testid="quantity-input"
                type="number"
                step="0.01"
                value={formData.quantity_kg}
                onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="submit-sale-button"
              disabled={loading}
              className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-6 h-6 mr-2" />
              {loading ? 'Saving...' : 'Record Sale'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}