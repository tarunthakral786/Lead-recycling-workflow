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
import { ArrowLeft, UserPlus, Trash2, Settings, Edit } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ControlPanelPage({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [drossEntries, setDrossEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({ pp_battery_percent: 60.5, mc_smf_battery_percent: 58.0 });
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (user.name !== 'TT') {
      navigate('/');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [usersRes, entriesRes, drossRes, salesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/entries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/dross-recycling/entries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/sales`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${API}/admin/recovery-settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      setEntries(entriesRes.data);
      setDrossEntries(drossRes.data);
      setSales(salesRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/entries/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteDrossEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this dross entry?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/dross-recycling/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Dross entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete dross entry');
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
      toast.success('Recovery settings updated! This will affect new recycling entries.');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const formatDateTime = (dateString) => {
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
      <div className="bg-purple-600 border-b border-purple-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-purple-700 hover:bg-purple-800 text-white border-0 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="control-panel-title">TT Admin Control Panel</h1>
              <p className="text-purple-100">Master User Controls</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl font-bold text-slate-700">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-14 mb-6">
              <TabsTrigger value="users" className="text-lg font-bold">Users ({users.length})</TabsTrigger>
              <TabsTrigger value="entries" className="text-lg font-bold">Entries ({entries.length + drossEntries.length})</TabsTrigger>
              <TabsTrigger value="sales" className="text-lg font-bold">Sales ({sales.length})</TabsTrigger>
              <TabsTrigger value="settings" className="text-lg font-bold">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="bg-white rounded-xl p-6 mb-6">
                <Button
                  onClick={() => setShowAddUser(true)}
                  data-testid="add-user-button"
                  className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add New User
                </Button>
              </Card>

              <div className="space-y-4">
                {users.map((u) => (
                  <Card key={u.id} className="bg-white rounded-lg p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xl font-bold text-slate-900">{u.name}</p>
                        <p className="text-base text-slate-600">{u.email}</p>
                      </div>
                      {u.name !== 'TT' && u.name !== 'Factory' && (
                        <Button
                          onClick={() => handleDeleteUser(u.id)}
                          className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="entries">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Refining & Recycling Entries</h3>
                {entries.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{entry.entry_type.toUpperCase()} - {entry.user_name}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(entry.timestamp)} | {entry.batches.length} batch(es)</p>
                      </div>
                      <Button
                        onClick={() => handleDeleteEntry(entry.id)}
                        data-testid={`delete-entry-${entry.id}`}
                        className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}

                <h3 className="text-xl font-bold text-slate-900 mt-8">HIGH LEAD Recovery Entries</h3>
                {drossEntries.map((entry) => (
                  <Card key={entry.id} className="bg-white rounded-lg p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-yellow-700">HIGH LEAD - {entry.user_name}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(entry.timestamp)} | {entry.batches.length} batch(es)</p>
                      </div>
                      <Button
                        onClick={() => handleDeleteDrossEntry(entry.id)}
                        className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sales">
              <div className="space-y-4">
                {sales.map((sale) => (
                  <Card key={sale.id} className="bg-white rounded-lg p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{sale.party_name}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(sale.timestamp)} | {sale.quantity_kg} kg by {sale.user_name}</p>
                      </div>
                      <Button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="bg-white rounded-xl p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Battery Recovery Percentages</h3>
                <p className="text-base text-slate-600 mb-6">Adjust recovery percentages for battery recycling calculations. Changes apply to new entries only.</p>
                
                <div className="space-y-6">
                  <div>
                    <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      PP Battery Recovery %
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.pp_battery_percent}
                      onChange={(e) => setSettings({ ...settings, pp_battery_percent: parseFloat(e.target.value) })}
                      className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      MC/SMF Battery Recovery %
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.mc_smf_battery_percent}
                      onChange={(e) => setSettings({ ...settings, mc_smf_battery_percent: parseFloat(e.target.value) })}
                      className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateSettings}
                    data-testid="save-settings-button"
                    className="w-full h-14 text-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-lg"
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="h-12 text-lg px-4 w-full"
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="h-12 text-lg px-4 w-full"
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label className="block text-sm font-bold text-slate-500 uppercase mb-2">Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="h-12 text-lg px-4 w-full"
                placeholder="Enter password"
              />
            </div>
            <Button
              onClick={handleAddUser}
              data-testid="submit-user-button"
              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}