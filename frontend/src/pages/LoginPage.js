import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post(`${API}/auth/register`, formData);
        toast.success('Account created! Please login.');
        setIsRegister(false);
        setFormData({ name: '', email: '', password: '' });
      } else {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        toast.success(`Welcome ${response.data.user.name}!`);
        onLogin(response.data.access_token, response.data.user);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2" data-testid="app-title">LeadTrack Pro</h1>
          <p className="text-lg text-slate-600">Lead Ingot Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <Label htmlFor="name" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                Full Name
              </Label>
              <Input
                id="name"
                data-testid="name-input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                placeholder="Enter name"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Email
            </Label>
            <Input
              id="email"
              data-testid="email-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </Label>
            <Input
              id="password"
              data-testid="password-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
              placeholder="Enter password"
              required
            />
          </div>

          <Button
            type="submit"
            data-testid="submit-button"
            disabled={loading}
            className="w-full h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              data-testid="toggle-mode-button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-orange-600 hover:text-orange-700 font-semibold text-lg"
            >
              {isRegister ? 'Already have an account? Login' : 'New employee? Create account'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}