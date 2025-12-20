import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HistoryPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/entries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEntries(response.data);
    } catch (error) {
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/entries/export/excel`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead_entries.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const viewDetails = async (entryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/entries/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedEntry(response.data);
      setShowDetail(true);
    } catch (error) {
      toast.error('Failed to load entry details');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-to-dashboard-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="history-title">Entry History</h1>
              <p className="text-base text-slate-600">{entries.length} total entries</p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            data-testid="export-excel-button"
            className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
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
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-2xl font-semibold text-slate-500">No entries yet</p>
            <p className="text-lg text-slate-400 mt-2">Start by creating your first entry</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:border-orange-300 transition-colors"
                data-testid={`entry-card-${entry.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-slate-900">{entry.user_name}</span>
                      <span className="text-base text-slate-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-xs">Ingot</span>
                        <p className="text-lg font-semibold text-slate-900">{entry.lead_ingot_kg} kg</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-xs">Pieces</span>
                        <p className="text-lg font-semibold text-slate-900">{entry.lead_ingot_pieces}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-xs">Total Dross</span>
                        <p className="text-lg font-semibold text-slate-900">
                          {(entry.initial_dross_kg + entry.dross_2nd_kg + entry.dross_3rd_kg).toFixed(2)} kg
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-xs">Pure Lead</span>
                        <p className="text-lg font-semibold text-green-600">{entry.pure_lead_kg} kg</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => viewDetails(entry.id)}
                    data-testid={`view-details-${entry.id}`}
                    className="h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View Photos
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4 text-base">
                <div>
                  <span className="font-bold text-slate-500">Employee:</span>
                  <p className="text-slate-900">{selectedEntry.user_name}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Date:</span>
                  <p className="text-slate-900">{formatDate(selectedEntry.timestamp)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Lead Ingot</h3>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <p><span className="font-bold">Weight:</span> {selectedEntry.lead_ingot_kg} kg</p>
                    <p><span className="font-bold">Pieces:</span> {selectedEntry.lead_ingot_pieces}</p>
                  </div>
                  <img
                    src={`data:image/jpeg;base64,${selectedEntry.lead_ingot_image}`}
                    alt="Lead Ingot"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Initial Dross</h3>
                  <p className="mb-3"><span className="font-bold">Weight:</span> {selectedEntry.initial_dross_kg} kg</p>
                  <img
                    src={`data:image/jpeg;base64,${selectedEntry.initial_dross_image}`}
                    alt="Initial Dross"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">2nd Dross</h3>
                  <p className="mb-3"><span className="font-bold">Weight:</span> {selectedEntry.dross_2nd_kg} kg</p>
                  <img
                    src={`data:image/jpeg;base64,${selectedEntry.dross_2nd_image}`}
                    alt="2nd Dross"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">3rd Dross</h3>
                  <p className="mb-3"><span className="font-bold">Weight:</span> {selectedEntry.dross_3rd_kg} kg</p>
                  <img
                    src={`data:image/jpeg;base64,${selectedEntry.dross_3rd_image}`}
                    alt="3rd Dross"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-green-600 mb-3">Pure Lead Output</h3>
                  <p className="mb-3"><span className="font-bold">Weight:</span> {selectedEntry.pure_lead_kg} kg</p>
                  <img
                    src={`data:image/jpeg;base64,${selectedEntry.pure_lead_image}`}
                    alt="Pure Lead"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}