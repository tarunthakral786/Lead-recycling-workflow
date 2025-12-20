import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Eye, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HistoryPage({ user }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [entriesRes, salesRes] = await Promise.all([
        axios.get(`${API}/entries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/sales`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setEntries(entriesRes.data);
      setSales(salesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
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
      link.setAttribute('download', 'leadtrack_report.xlsx');
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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const refiningEntries = entries.filter(e => e.entry_type === 'refining');
  const recyclingEntries = entries.filter(e => e.entry_type === 'recycling');

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
              <h1 className="text-2xl font-bold text-slate-900" data-testid="history-title">History & Records</h1>
              <p className="text-base text-slate-600">{entries.length} entries, {sales.length} sales</p>
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
        ) : (
          <Tabs defaultValue="refining" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-14 mb-6">
              <TabsTrigger value="refining" className="text-lg font-bold" data-testid="refining-tab">Refining ({refiningEntries.length})</TabsTrigger>
              <TabsTrigger value="recycling" className="text-lg font-bold" data-testid="recycling-tab">Recycling ({recyclingEntries.length})</TabsTrigger>
              <TabsTrigger value="sales" className="text-lg font-bold" data-testid="sales-tab">Sales ({sales.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="refining" className="space-y-4">
              {refiningEntries.length === 0 ? (
                <Card className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <p className="text-2xl font-semibold text-slate-500">No refining entries yet</p>
                </Card>
              ) : (
                refiningEntries.map((entry) => {
                  const dt = formatDateTime(entry.timestamp);
                  const totalPureLead = entry.batches.reduce((sum, b) => sum + b.pure_lead_kg, 0);
                  return (
                    <Card
                      key={entry.id}
                      className="bg-white rounded-lg border border-slate-200 p-6 hover:border-orange-300 transition-colors"
                      data-testid={`entry-card-${entry.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-slate-900">{entry.user_name}</span>
                            <div className="flex items-center gap-2 text-base text-slate-500">
                              <Clock className="w-4 h-4" />
                              <span>{dt.date} at {dt.time}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Batches</span>
                              <p className="text-lg font-semibold text-slate-900">{entry.batches.length}</p>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Pure Lead</span>
                              <p className="text-lg font-semibold text-green-600">{totalPureLead.toFixed(2)} kg</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => viewDetails(entry.id)}
                          data-testid={`view-details-${entry.id}`}
                          className="h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                        >
                          <Eye className="w-5 h-5 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="recycling" className="space-y-4">
              {recyclingEntries.length === 0 ? (
                <Card className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <p className="text-2xl font-semibold text-slate-500">No recycling entries yet</p>
                </Card>
              ) : (
                recyclingEntries.map((entry) => {
                  const dt = formatDateTime(entry.timestamp);
                  const totalRemelted = entry.batches.reduce((sum, b) => sum + b.remelted_lead_kg, 0);
                  return (
                    <Card
                      key={entry.id}
                      className="bg-white rounded-lg border border-slate-200 p-6 hover:border-green-300 transition-colors"
                      data-testid={`entry-card-${entry.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-slate-900">{entry.user_name}</span>
                            <div className="flex items-center gap-2 text-base text-slate-500">
                              <Clock className="w-4 h-4" />
                              <span>{dt.date} at {dt.time}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Batches</span>
                              <p className="text-lg font-semibold text-slate-900">{entry.batches.length}</p>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Remelted Lead</span>
                              <p className="text-lg font-semibold text-green-600">{totalRemelted.toFixed(2)} kg</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => viewDetails(entry.id)}
                          data-testid={`view-details-${entry.id}`}
                          className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                        >
                          <Eye className="w-5 h-5 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              {sales.length === 0 ? (
                <Card className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <p className="text-2xl font-semibold text-slate-500">No sales recorded yet</p>
                </Card>
              ) : (
                sales.map((sale) => {
                  const dt = formatDateTime(sale.timestamp);
                  return (
                    <Card
                      key={sale.id}
                      className="bg-white rounded-lg border border-slate-200 p-6"
                      data-testid={`sale-card-${sale.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-slate-900">{sale.party_name}</span>
                            <div className="flex items-center gap-2 text-base text-slate-500">
                              <Clock className="w-4 h-4" />
                              <span>{dt.date} at {dt.time}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Employee</span>
                              <p className="text-lg font-semibold text-slate-900">{sale.user_name}</p>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-xs">Quantity</span>
                              <p className="text-lg font-semibold text-blue-600">{sale.quantity_kg} kg</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
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
                  <span className="font-bold text-slate-500">Date/Time:</span>
                  <p className="text-slate-900">{formatDateTime(selectedEntry.timestamp).date} at {formatDateTime(selectedEntry.timestamp).time}</p>
                </div>
              </div>

              {selectedEntry.entry_type === 'refining' && selectedEntry.batches.map((batch, idx) => (
                <div key={idx} className="border-t pt-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Batch {idx + 1}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold text-slate-700 mb-2">Lead Ingot: {batch.lead_ingot_kg} kg ({batch.lead_ingot_pieces} pieces)</p>
                      <img src={`data:image/jpeg;base64,${batch.lead_ingot_image}`} alt="Lead Ingot" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mb-2">Initial Dross: {batch.initial_dross_kg} kg</p>
                      <img src={`data:image/jpeg;base64,${batch.initial_dross_image}`} alt="Initial Dross" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mb-2">2nd Dross: {batch.dross_2nd_kg} kg</p>
                      <img src={`data:image/jpeg;base64,${batch.dross_2nd_image}`} alt="2nd Dross" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mb-2">3rd Dross: {batch.dross_3rd_kg} kg</p>
                      <img src={`data:image/jpeg;base64,${batch.dross_3rd_image}`} alt="3rd Dross" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-green-700 mb-2">Pure Lead Output: {batch.pure_lead_kg} kg</p>
                      <img src={`data:image/jpeg;base64,${batch.pure_lead_image}`} alt="Pure Lead" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}

              {selectedEntry.entry_type === 'recycling' && selectedEntry.batches.map((batch, idx) => (
                <div key={idx} className="border-t pt-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Batch {idx + 1}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold text-slate-700 mb-2">{batch.battery_type} Battery: {batch.battery_kg} kg</p>
                      <img src={`data:image/jpeg;base64,${batch.battery_image}`} alt="Battery" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-bold text-slate-500 uppercase">Expected Output</p>
                        <p className="text-2xl font-bold text-green-600">{batch.remelted_lead_kg} kg</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500 uppercase">Quantity Received</p>
                        <p className="text-2xl font-bold text-slate-900">{batch.quantity_received} kg</p>
                      </div>
                      {user.name === 'TT' && (
                        <>
                          <div>
                            <p className="text-sm font-bold text-blue-500 uppercase">Receivable</p>
                            <p className="text-2xl font-bold text-blue-600">{batch.receivable_kg} kg</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-purple-500 uppercase">Recovery %</p>
                            <p className="text-2xl font-bold text-purple-600">{batch.recovery_percent}%</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-green-700 mb-2">Remelted Lead Photo</p>
                      <img src={`data:image/jpeg;base64,${batch.remelted_lead_image}`} alt="Remelted Lead" className="w-full h-48 object-contain bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}