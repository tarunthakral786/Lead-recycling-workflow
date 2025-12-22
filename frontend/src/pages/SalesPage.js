import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, Package, Calendar, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SalesPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableSkus, setAvailableSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    party_name: '',
    sku_type: '',
    quantity_kg: ''
  });

  useEffect(() => {
    fetchAvailableSkus();
  }, []);

  const fetchAvailableSkus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales/available-skus`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAvailableSkus(response.data);
    } catch (error) {
      console.error('Failed to load available SKUs');
      toast.error('Failed to load available inventory');
    } finally {
      setLoadingSkus(false);
    }
  };

  const selectedSku = availableSkus.find(sku => sku.sku_type === formData.sku_type);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sku_type) {
      toast.error('Please select an SKU to sell');
      return;
    }
    
    const quantity = parseFloat(formData.quantity_kg);
    if (selectedSku && quantity > selectedSku.available_kg) {
      toast.error(`Cannot sell more than available stock (${selectedSku.available_kg} kg)`);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/sales`, {
        party_name: formData.party_name,
        sku_type: formData.sku_type,
        quantity_kg: quantity,
        entry_date: entryDate
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
              <p className="text-base text-slate-600">Sell from available inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Date Picker */}
        <Card className="bg-blue-50 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <Label className="text-sm font-bold text-blue-700 uppercase">Sale Date</Label>
            </div>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 text-lg px-4 border-2 border-blue-200 rounded-lg bg-white"
              data-testid="entry-date-input"
            />
          </div>
        </Card>

        {/* Available Inventory Summary */}
        {!loadingSkus && availableSkus.length === 0 && (
          <Card className="bg-amber-50 border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="text-lg font-bold text-amber-900">No Inventory Available</h3>
                <p className="text-amber-700">There is no stock available for sale. Please add inventory first.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Available SKUs Preview */}
        {!loadingSkus && availableSkus.length > 0 && (
          <Card className="bg-slate-50 border-slate-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase mb-3">Available Inventory</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableSkus.map((sku, idx) => (
                <div key={idx} className={`p-3 rounded-lg border-2 ${
                  formData.sku_type === sku.sku_type 
                    ? 'bg-blue-100 border-blue-400' 
                    : 'bg-white border-slate-200'
                }`}>
                  <p className="text-sm font-bold text-slate-800 truncate">{sku.sku_type}</p>
                  {sku.sb_percentage && (
                    <p className="text-xs text-slate-500">SB: {sku.sb_percentage}%</p>
                  )}
                  <p className="text-lg font-bold text-green-700">{sku.available_kg} kg</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SKU Selection */}
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Package className="w-4 h-4 inline mr-2" />
                Select SKU to Sell
              </Label>
              <Select
                value={formData.sku_type}
                onValueChange={(value) => setFormData({ ...formData, sku_type: value })}
                disabled={loadingSkus || availableSkus.length === 0}
              >
                <SelectTrigger className="h-16 text-xl px-4 w-full border-2 border-slate-200 rounded-lg" data-testid="sku-select">
                  <SelectValue placeholder={loadingSkus ? "Loading..." : "Select SKU"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSkus.map((sku, idx) => (
                    <SelectItem key={idx} value={sku.sku_type} className="text-lg">
                      <div className="flex justify-between items-center gap-4">
                        <span>{sku.display_name}</span>
                        <span className="text-green-600 font-bold">{sku.available_kg} kg</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedSku && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Available: <span className="font-bold">{selectedSku.available_kg} kg</span>
                    {selectedSku.sb_percentage && (
                      <span className="ml-2">| SB: {selectedSku.sb_percentage}%</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Party Name */}
            <div>
              <Label htmlFor="party_name" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                Party Name / Buyer
              </Label>
              <Input
                id="party_name"
                data-testid="party-name-input"
                type="text"
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                placeholder="Enter buyer name"
                required
              />
            </div>

            {/* Quantity */}
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
                max={selectedSku?.available_kg}
                required
              />
              {selectedSku && formData.quantity_kg && parseFloat(formData.quantity_kg) > selectedSku.available_kg && (
                <p className="text-sm text-red-600 mt-2">
                  Cannot sell more than available stock ({selectedSku.available_kg} kg)
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              data-testid="submit-sale-button"
              disabled={loading || !formData.sku_type || !formData.quantity_kg || availableSkus.length === 0}
              className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-6 h-6 mr-2" />
              {loading ? 'Recording Sale...' : 'Record Sale'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
