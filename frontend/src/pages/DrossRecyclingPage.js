import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Clock, Download, Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DrossRecyclingPage({ user }) {
  const navigate = useNavigate();
  const [drossData, setDrossData] = useState([]);
  const [recyclingEntries, setRecyclingEntries] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showAddEntryDialog, setShowAddEntryDialog] = useState(false);
  const [selectedDross, setSelectedDross] = useState(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // New entry state
  const [entryBatches, setEntryBatches] = useState([{
    dross_type: 'initial',
    quantity_sent: '',
    high_lead_recovered: '',
    spectro_image: null
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [drossRes, recoveryRes, recyclingRes] = await Promise.all([
        axios.get(`${API}/dross`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/dross/recoveries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/dross-recycling/entries`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setDrossData(drossRes.data);
      setRecoveries(recoveryRes.data);
      setRecyclingEntries(recyclingRes.data);
    } catch (error) {
      toast.error('Failed to load dross data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecovery = (drossItem) => {
    setSelectedDross(drossItem);
    setRecoveryAmount('');
    setShowRecoveryDialog(true);
  };

  const handleSubmitRecovery = async () => {
    if (!recoveryAmount || parseFloat(recoveryAmount) <= 0) {
      toast.error('Please enter a valid recovery amount');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/dross/recovery`, {
        dross_entry_id: selectedDross.entry_id,
        batch_number: selectedDross.batch_number,
        pure_lead_recovered: parseFloat(recoveryAmount)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Pure lead recovery recorded!');
      setShowRecoveryDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record recovery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dross/export/excel`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dross_data.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const getRecoveryForBatch = (entryId, batchNumber) => {
    return recoveries.find(r => r.dross_entry_id === entryId && r.batch_number === batchNumber);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const totalDross = drossData.reduce((sum, item) => sum + item.total_dross, 0);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="dross-recycling-title">Dross Recycling</h1>
              <p className="text-base text-slate-600">{drossData.length} entries | Total: {totalDross.toFixed(2)} kg</p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            data-testid="export-dross-button"
            className="h-12 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl font-bold text-slate-700">Loading...</div>
          </div>
        ) : drossData.length === 0 ? (
          <Card className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-2xl font-semibold text-slate-500">No dross data yet</p>
            <p className="text-lg text-slate-400 mt-2">Dross will appear here after refining entries</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {drossData.map((item, index) => {
              const dt = formatDateTime(item.timestamp);
              const recovery = getRecoveryForBatch(item.entry_id, item.batch_number);
              
              return (
                <Card
                  key={`${item.entry_id}-${item.batch_number}`}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:border-amber-300 transition-colors"
                  data-testid={`dross-card-${index}`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-900">{item.user_name}</span>
                        <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">
                          Batch {item.batch_number}
                        </span>
                        {recovery && (
                          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                            ✓ Recovered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-base text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>{dt.date} at {dt.time}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-amber-50 rounded-lg p-4">
                        <span className="text-sm font-bold text-amber-700 uppercase block mb-1">Initial Dross</span>
                        <p className="text-2xl font-bold text-amber-800">{item.initial_dross_kg} kg</p>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <span className="text-sm font-bold text-orange-700 uppercase block mb-1">2nd Dross</span>
                        <p className="text-2xl font-bold text-orange-800">{item.dross_2nd_kg} kg</p>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4">
                        <span className="text-sm font-bold text-red-700 uppercase block mb-1">3rd Dross</span>
                        <p className="text-2xl font-bold text-red-800">{item.dross_3rd_kg} kg</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                        <span className="text-sm font-bold text-slate-600 uppercase block mb-1">Total Dross</span>
                        <p className="text-2xl font-bold text-slate-900">{item.total_dross.toFixed(2)} kg</p>
                      </div>
                    </div>

                    {recovery ? (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-bold text-green-700 uppercase block mb-1">Pure Lead Recovered</span>
                            <p className="text-2xl font-bold text-green-800">{recovery.pure_lead_recovered} kg</p>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-green-700 uppercase block mb-1">Recovery %</span>
                            <p className="text-2xl font-bold text-green-800">{recovery.recovery_percentage}%</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAddRecovery(item)}
                        data-testid={`add-recovery-${index}`}
                        className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Pure Lead Recovery
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add Pure Lead Recovery</DialogTitle>
          </DialogHeader>
          {selectedDross && (
            <div className="space-y-6 mt-4">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm font-bold text-amber-700 uppercase mb-2">Batch Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-bold">Batch:</span> {selectedDross.batch_number}</p>
                  <p><span className="font-bold">Employee:</span> {selectedDross.user_name}</p>
                  <p><span className="font-bold">Initial:</span> {selectedDross.initial_dross_kg} kg</p>
                  <p><span className="font-bold">2nd:</span> {selectedDross.dross_2nd_kg} kg</p>
                  <p><span className="font-bold">3rd:</span> {selectedDross.dross_3rd_kg} kg</p>
                  <p><span className="font-bold">Total:</span> {selectedDross.total_dross} kg</p>
                </div>
              </div>

              <div>
                <Label htmlFor="recovery" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pure Lead Recovered (KG)
                </Label>
                <Input
                  id="recovery"
                  data-testid="recovery-input"
                  type="number"
                  step="0.01"
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSubmitRecovery}
                data-testid="submit-recovery-button"
                disabled={submitting}
                className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Recovery'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
