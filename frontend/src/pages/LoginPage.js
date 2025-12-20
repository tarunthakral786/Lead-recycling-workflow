import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Factory, Building2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage({ onLogin }) {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const accounts = [
    { id: 'factory', name: 'Factory', email: 'factory@leadtrack.com', icon: Factory, color: 'orange' },
    { id: 'tt', name: 'TT', email: 'tt@leadtrack.com', icon: Building2, color: 'blue' }
  ];

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

  if (!selectedAccount) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-2" data-testid="app-title">LeadTrack Pro</h1>
            <p className="text-xl text-slate-600">Select Account</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account) => {
              const Icon = account.icon;
              return (
                <Card
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  data-testid={`select-${account.id}`}
                  className={`p-8 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${
                    account.color === 'orange' 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                      : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
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

  const Icon = selectedAccount.icon;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            selectedAccount.color === 'orange' ? 'bg-orange-100' : 'bg-blue-100'
          }`}>
            <Icon className={`w-12 h-12 ${
              selectedAccount.color === 'orange' ? 'text-orange-600' : 'text-blue-600'
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
              selectedAccount.color === 'orange'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
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