import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Factory, Building2, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/list`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const getIcon = (userName) => {
    if (userName === 'Factory') return Factory;
    if (userName === 'TT') return Building2;
    return User;
  };

  const getColor = (userName) => {
    if (userName === 'Factory') return 'orange';
    if (userName === 'TT') return 'blue';
    return 'slate';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: selectedAccount.email,
        password: password
      });
      toast.success(`Welcome ${response.data.user.name}!`);
      onLogin(response.data.access_token, response.data.user);
    } catch (error) {
      toast.error('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-slate-700">Loading...</div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-2" data-testid="app-title">LeadTrack Pro</h1>
            <p className="text-xl text-slate-600">Select Account</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((account) => {
              const Icon = getIcon(account.name);
              const color = getColor(account.name);
              
              return (
                <Card
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  data-testid={`select-${account.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`p-8 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${
                    color === 'orange' 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                      : color === 'blue'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
                  } border-0`}
                >
                  <div className="text-center">
                    <Icon className="w-20 h-20 text-white mx-auto mb-4" />
                    <h2 className="text-4xl font-bold text-white mb-2">{account.name}</h2>
                    <p className="text-xl text-white/80">Tap to access</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const Icon = getIcon(selectedAccount.name);
  const color = getColor(selectedAccount.name);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            color === 'orange' ? 'bg-orange-100' : color === 'blue' ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <Icon className={`w-12 h-12 ${
              color === 'orange' ? 'text-orange-600' : color === 'blue' ? 'text-blue-600' : 'text-slate-600'
            }`} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" data-testid="account-name">{selectedAccount.name}</h1>
          <p className="text-lg text-slate-600">Enter Password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="password" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </Label>
            <Input
              id="password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 text-center tracking-widest"
              placeholder="••••"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            data-testid="submit-button"
            disabled={loading}
            className={`w-full h-16 text-xl font-bold text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all ${
              color === 'orange'
                ? 'bg-orange-600 hover:bg-orange-700'
                : color === 'blue'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-600 hover:bg-slate-700'
            }`}
          >
            {loading ? 'Please wait...' : 'Access Account'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              data-testid="back-button"
              onClick={() => {
                setSelectedAccount(null);
                setPassword('');
              }}
              className="text-slate-600 hover:text-slate-700 font-semibold text-lg"
            >
              ← Back to account selection
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}