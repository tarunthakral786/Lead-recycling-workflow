import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, UserPlus, Trash2, Settings, Key, RefreshCw, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ControlPanelPage({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [refiningEntries, setRefiningEntries] = useState([]);
  const [recyclingEntries, setRecyclingEntries] = useState([]);
  const [drossEntries, setDrossEntries] = useState([]);
  const [rmlPurchases, setRmlPurchases] = useState([]);
  const [rmlReceivedSantosh, setRmlReceivedSantosh] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({ pp_battery_percent: 60.5, mc_smf_battery_percent: 57.5, hr_battery_percent: 50.0 });
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (user.name !== 'TT') {
      navigate('/');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [usersRes, entriesRes, drossRes, rmlRes, rmlSantoshRes, salesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/entries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/dross-recycling/entries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/rml-purchases`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/rml-received-santosh`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/sales`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/admin/recovery-settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      
      // Separate refining and recycling entries
      const allEntries = entriesRes.data;
      setRefiningEntries(allEntries.filter(e => e.entry_type === 'refining'));
      setRecyclingEntries(allEntries.filter(e => e.entry_type === 'recycling'));
      
      setDrossEntries(drossRes.data);
      setRmlPurchases(rmlRes.data);
      setRmlReceivedSantosh(rmlSantoshRes.data);
      setSales(salesRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // User management
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/users`, newUser, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('User added successfully');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('User deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowChangePassword(true);
  };

  const handleSubmitPasswordChange = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${selectedUser.id}/password`, 
        { new_password: newPassword },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      toast.success(`Password updated for ${selectedUser.name}`);
      setShowChangePassword(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
  };

  // Delete handlers for each entry type
  const handleDeleteEntry = async (entryId, entryType) => {
    if (!confirm(`Are you sure you want to delete this ${entryType} entry?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/entries/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(`${entryType} entry deleted`);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteDrossEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this HIGH LEAD entry?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/dross-recycling/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('HIGH LEAD entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteRmlPurchase = async (entryId) => {
    if (!confirm('Are you sure you want to delete this RML Purchase entry?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/rml-purchases/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('RML Purchase entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteRmlReceivedSantosh = async (entryId) => {
    if (!confirm('Are you sure you want to delete this RML Received Santosh entry?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/rml-received-santosh/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('RML Received Santosh entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/sales/${saleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Sale deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete sale');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/recovery-settings`, settings, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Recovery settings updated!');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL entries. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Confirm again to proceed.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API}/admin/clear-all-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(`All data cleared! ${JSON.stringify(response.data.deleted)}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  // Calculate totals for each entry type
  const getTotalQuantity = (entries, field) => {
    return entries.reduce((sum, entry) => {
      return sum + (entry.batches || []).reduce((batchSum, batch) => {
        return batchSum + (batch[field] || 0);
      }, 0);
    }, 0).toFixed(2);
  };

  const totalEntries = refiningEntries.length + recyclingEntries.length + drossEntries.length + 
                       rmlPurchases.length + rmlReceivedSantosh.length + sales.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-slate-700">Loading Control Panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              className="h-12 px-4 bg-slate-700 hover:bg-slate-600 text-white border-0 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Control Panel</h1>
              <p className="text-base text-slate-300">TT Admin • {totalEntries} total entries</p>
            </div>
          </div>
          <Button
            onClick={fetchData}
            className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="refining" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto gap-1 mb-6 bg-slate-200 p-1 rounded-lg">
            <TabsTrigger value="refining" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Refining ({refiningEntries.length})
            </TabsTrigger>
            <TabsTrigger value="recycling" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Recycling ({recyclingEntries.length})
            </TabsTrigger>
            <TabsTrigger value="dross" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              High Lead ({drossEntries.length})
            </TabsTrigger>
            <TabsTrigger value="rml" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              RML Buy ({rmlPurchases.length})
            </TabsTrigger>
            <TabsTrigger value="santosh" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Santosh ({rmlReceivedSantosh.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Sales ({sales.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm font-bold py-2 data-[state=active]:bg-white">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* REFINING ENTRIES */}
          <TabsContent value="refining">
            <Card className="bg-blue-50 border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-blue-800 font-bold">Total Pure Lead Produced: {getTotalQuantity(refiningEntries, 'pure_lead_kg')} kg</p>
            </Card>
            <div className="space-y-3">
              {refiningEntries.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No refining entries</Card>
              ) : (
                refiningEntries.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">REFINING</span>
                          <span className="text-sm text-slate-600">{formatDateTime(entry.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {entry.user_name}</span>
                        </div>
                        {entry.batches && entry.batches.map((batch, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-3 mb-2 text-sm">
                            <p><strong>Batch {idx + 1}:</strong> {batch.lead_ingot_kg} kg input → {batch.pure_lead_kg} kg pure lead</p>
                            <p className="text-slate-600">
                              Dross: {batch.initial_dross_kg || 0} + {batch.cu_dross_kg || batch.dross_2nd_kg || 0} + {batch.sn_dross_kg || batch.dross_3rd_kg || 0} + {batch.sb_dross_kg || 0} kg
                              {batch.sb_percentage && ` | SB: ${batch.sb_percentage}%`}
                            </p>
                            {batch.input_source && batch.input_source !== 'manual' && (
                              <p className="text-blue-600">Source: {batch.input_source}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleDeleteEntry(entry.id, 'Refining')} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* RECYCLING ENTRIES */}
          <TabsContent value="recycling">
            <Card className="bg-green-50 border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-800 font-bold">Total Receivable: {getTotalQuantity(recyclingEntries, 'receivable_kg')} kg</p>
            </Card>
            <div className="space-y-3">
              {recyclingEntries.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No recycling entries</Card>
              ) : (
                recyclingEntries.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">RECYCLING</span>
                          <span className="text-sm text-slate-600">{formatDateTime(entry.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {entry.user_name}</span>
                        </div>
                        {entry.batches && entry.batches.map((batch, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-3 mb-2 text-sm">
                            <p><strong>Batch {idx + 1}:</strong> {batch.battery_type} - {batch.quantity_kg} kg @ {batch.recovery_percent}%</p>
                            <p className="text-green-600">Receivable: {batch.receivable_kg} kg</p>
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleDeleteEntry(entry.id, 'Recycling')} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* DROSS / HIGH LEAD ENTRIES */}
          <TabsContent value="dross">
            <Card className="bg-yellow-50 border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-yellow-800 font-bold">Total High Lead Recovered: {getTotalQuantity(drossEntries, 'high_lead_recovered')} kg</p>
            </Card>
            <div className="space-y-3">
              {drossEntries.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No HIGH LEAD entries</Card>
              ) : (
                drossEntries.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">HIGH LEAD</span>
                          <span className="text-sm text-slate-600">{formatDateTime(entry.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {entry.user_name}</span>
                        </div>
                        {entry.batches && entry.batches.map((batch, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-3 mb-2 text-sm">
                            <p><strong>Batch {idx + 1}:</strong> {batch.dross_type} - {batch.quantity_sent} kg sent</p>
                            <p className="text-yellow-600">High Lead Recovered: {batch.high_lead_recovered} kg</p>
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleDeleteDrossEntry(entry.id)} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* RML PURCHASES */}
          <TabsContent value="rml">
            <Card className="bg-purple-50 border-purple-200 rounded-xl p-4 mb-4">
              <p className="text-purple-800 font-bold">Total RML Purchased: {getTotalQuantity(rmlPurchases, 'quantity_kg')} kg</p>
            </Card>
            <div className="space-y-3">
              {rmlPurchases.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No RML purchase entries</Card>
              ) : (
                rmlPurchases.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">RML PURCHASE</span>
                          <span className="text-sm text-slate-600">{formatDateTime(entry.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {entry.user_name}</span>
                        </div>
                        {entry.batches && entry.batches.map((batch, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-3 mb-2 text-sm">
                            <p><strong>SKU:</strong> {batch.sku}</p>
                            <p>{batch.quantity_kg} kg | {batch.pieces} pcs | SB: {batch.sb_percentage}%</p>
                            {batch.remarks && <p className="text-slate-600">Seller: {batch.remarks}</p>}
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleDeleteRmlPurchase(entry.id)} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* RML RECEIVED SANTOSH */}
          <TabsContent value="santosh">
            <Card className="bg-green-50 border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-800 font-bold">Total RML Received (Santosh): {getTotalQuantity(rmlReceivedSantosh, 'quantity_kg')} kg</p>
            </Card>
            <div className="space-y-3">
              {rmlReceivedSantosh.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No RML Received Santosh entries</Card>
              ) : (
                rmlReceivedSantosh.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">RML SANTOSH</span>
                          <span className="text-sm text-slate-600">{formatDateTime(entry.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {entry.user_name}</span>
                        </div>
                        {entry.batches && entry.batches.map((batch, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-3 mb-2 text-sm">
                            <p><strong>SKU:</strong> {batch.sku}</p>
                            <p>{batch.quantity_kg} kg | {batch.pieces} pcs | SB: {batch.sb_percentage}%</p>
                            {batch.remarks && <p className="text-slate-600">Remarks: {batch.remarks}</p>}
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleDeleteRmlReceivedSantosh(entry.id)} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* SALES */}
          <TabsContent value="sales">
            <Card className="bg-cyan-50 border-cyan-200 rounded-xl p-4 mb-4">
              <p className="text-cyan-800 font-bold">Total Sold: {sales.reduce((sum, s) => sum + s.quantity_kg, 0).toFixed(2)} kg</p>
            </Card>
            <div className="space-y-3">
              {sales.length === 0 ? (
                <Card className="bg-white rounded-lg p-6 text-center text-slate-500">No sales entries</Card>
              ) : (
                sales.map((sale) => (
                  <Card key={sale.id} className="bg-white rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-bold rounded">SALE</span>
                          <span className="text-sm text-slate-600">{formatDateTime(sale.timestamp)}</span>
                          <span className="text-sm text-slate-500">by {sale.user_name}</span>
                        </div>
                        <div className="bg-slate-50 rounded p-3 text-sm">
                          <p><strong>Party:</strong> {sale.party_name}</p>
                          <p><strong>SKU:</strong> {sale.sku_type || 'N/A'}</p>
                          <p><strong>Quantity:</strong> {sale.quantity_kg} kg</p>
                        </div>
                      </div>
                      <Button onClick={() => handleDeleteSale(sale.id)} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddUser(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <UserPlus className="w-5 h-5 mr-2" /> Add User
              </Button>
            </div>
            <div className="space-y-3">
              {users.map((u) => (
                <Card key={u.id} className="bg-white rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{u.name}</p>
                      <p className="text-sm text-slate-600">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleChangePassword(u)} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Key className="w-4 h-4 mr-1" /> Password
                      </Button>
                      {u.name !== 'TT' && u.name !== 'Factory' && (
                        <Button onClick={() => handleDeleteUser(u.id)} className="bg-red-600 hover:bg-red-700 text-white">
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings">
            <Card className="bg-white rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Recovery Percentages</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">PP Battery (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.pp_battery_percent}
                    onChange={(e) => setSettings({ ...settings, pp_battery_percent: parseFloat(e.target.value) })}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">MC/SMF Battery (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.mc_smf_battery_percent}
                    onChange={(e) => setSettings({ ...settings, mc_smf_battery_percent: parseFloat(e.target.value) })}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">HR Battery (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.hr_battery_percent}
                    onChange={(e) => setSettings({ ...settings, hr_battery_percent: parseFloat(e.target.value) })}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateSettings} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold">
                <Settings className="w-5 h-5 mr-2" /> Save Settings
              </Button>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">Danger Zone</h3>
              </div>
              <p className="text-red-700 mb-4">This will permanently delete ALL entries (Refining, Recycling, Dross, RML, Sales). Users and settings will be preserved.</p>
              <Button onClick={handleClearAllData} className="w-full h-12 bg-red-600 hover:bg-red-700 text-white text-lg font-bold">
                <Trash2 className="w-5 h-5 mr-2" /> Clear All Data
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Name</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="h-12 text-lg" placeholder="Enter name" />
            </div>
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="h-12 text-lg" placeholder="Enter email" />
            </div>
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Password</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="h-12 text-lg" placeholder="Enter password" />
            </div>
            <Button onClick={handleAddUser} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-bold">Add User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Change Password</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-100 rounded-lg p-4">
                <p className="text-sm text-slate-500">Changing password for:</p>
                <p className="text-lg font-bold text-slate-900">{selectedUser.name}</p>
                <p className="text-sm text-slate-600">{selectedUser.email}</p>
              </div>
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 text-lg" placeholder="Enter new password" />
              </div>
              <Button onClick={handleSubmitPasswordChange} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold">
                <Key className="w-5 h-5 mr-2" /> Update Password
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
