import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Camera, LogOut, History, Upload } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lead_ingot_kg: '',
    lead_ingot_pieces: '',
    lead_ingot_image: null,
    initial_dross_kg: '',
    initial_dross_image: null,
    dross_2nd_kg: '',
    dross_2nd_image: null,
    dross_3rd_kg: '',
    dross_3rd_image: null,
    pure_lead_kg: '',
    pure_lead_image: null
  });
  const [imagePreviews, setImagePreviews] = useState({});

  const handleFileChange = (field, file) => {
    setFormData({ ...formData, [field]: file });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews({ ...imagePreviews, [field]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append('lead_ingot_kg', formData.lead_ingot_kg);
      form.append('lead_ingot_pieces', formData.lead_ingot_pieces);
      form.append('lead_ingot_image', formData.lead_ingot_image);
      form.append('initial_dross_kg', formData.initial_dross_kg);
      form.append('initial_dross_image', formData.initial_dross_image);
      form.append('dross_2nd_kg', formData.dross_2nd_kg);
      form.append('dross_2nd_image', formData.dross_2nd_image);
      form.append('dross_3rd_kg', formData.dross_3rd_kg);
      form.append('dross_3rd_image', formData.dross_3rd_image);
      form.append('pure_lead_kg', formData.pure_lead_kg);
      form.append('pure_lead_image', formData.pure_lead_image);

      const token = localStorage.getItem('token');
      await axios.post(`${API}/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Entry saved successfully!');
      setFormData({
        lead_ingot_kg: '',
        lead_ingot_pieces: '',
        lead_ingot_image: null,
        initial_dross_kg: '',
        initial_dross_image: null,
        dross_2nd_kg: '',
        dross_2nd_image: null,
        dross_3rd_kg: '',
        dross_3rd_image: null,
        pure_lead_kg: '',
        pure_lead_image: null
      });
      setImagePreviews({});
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.lead_ingot_kg && formData.lead_ingot_pieces && formData.lead_ingot_image;
    } else if (step === 2) {
      return formData.initial_dross_kg && formData.initial_dross_image && formData.dross_2nd_kg && formData.dross_2nd_image && formData.dross_3rd_kg && formData.dross_3rd_image;
    } else if (step === 3) {
      return formData.pure_lead_kg && formData.pure_lead_image;
    }
    return false;
  };

  const renderImageUpload = (field, label) => (
    <div>
      <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </Label>
      <label
        htmlFor={field}
        className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer h-48 flex flex-col items-center justify-center gap-3"
        data-testid={`${field}-upload-zone`}
      >
        {imagePreviews[field] ? (
          <img src={imagePreviews[field]} alt="Preview" className="h-40 object-contain" />
        ) : (
          <>
            <Camera className="w-12 h-12 text-slate-400" />
            <span className="text-lg font-semibold text-slate-500">Tap to capture</span>
          </>
        )}
      </label>
      <input
        id={field}
        data-testid={`${field}-input`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(field, e.target.files[0])}
        className="hidden"
        required
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="dashboard-title">LeadTrack Pro</h1>
            <p className="text-base text-slate-600">Welcome, {user.name}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/history')}
              data-testid="history-button"
              className="h-12 px-6 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg font-bold"
            >
              <History className="w-5 h-5 mr-2" />
              History
            </Button>
            <Button
              onClick={onLogout}
              data-testid="logout-button"
              className="h-12 px-6 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                step === s ? 'bg-orange-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
              data-testid={`step-indicator-${s}`}
            >
              {s}
            </div>
          ))}
        </div>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-6" data-testid="step-title">Lead Ingot Input</h2>
              
              <div>
                <Label htmlFor="lead_kg" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Weight (KG)
                </Label>
                <Input
                  id="lead_kg"
                  data-testid="lead-ingot-kg-input"
                  type="number"
                  step="0.01"
                  value={formData.lead_ingot_kg}
                  onChange={(e) => setFormData({ ...formData, lead_ingot_kg: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lead_pieces" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pieces
                </Label>
                <Input
                  id="lead_pieces"
                  data-testid="lead-ingot-pieces-input"
                  type="number"
                  value={formData.lead_ingot_pieces}
                  onChange={(e) => setFormData({ ...formData, lead_ingot_pieces: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0"
                  required
                />
              </div>

              {renderImageUpload('lead_ingot_image', 'Photo of Weight')}

              <Button
                onClick={() => setStep(2)}
                data-testid="next-step-button"
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Dross Inputs
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-6" data-testid="step-title">Dross Inputs</h2>
              
              <div>
                <Label htmlFor="initial_dross" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Initial Dross (KG)
                </Label>
                <Input
                  id="initial_dross"
                  data-testid="initial-dross-kg-input"
                  type="number"
                  step="0.01"
                  value={formData.initial_dross_kg}
                  onChange={(e) => setFormData({ ...formData, initial_dross_kg: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              {renderImageUpload('initial_dross_image', 'Photo of Initial Dross')}

              <div>
                <Label htmlFor="dross_2nd" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  2nd Dross (KG)
                </Label>
                <Input
                  id="dross_2nd"
                  data-testid="dross-2nd-kg-input"
                  type="number"
                  step="0.01"
                  value={formData.dross_2nd_kg}
                  onChange={(e) => setFormData({ ...formData, dross_2nd_kg: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              {renderImageUpload('dross_2nd_image', 'Photo of 2nd Dross')}

              <div>
                <Label htmlFor="dross_3rd" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  3rd Dross (KG)
                </Label>
                <Input
                  id="dross_3rd"
                  data-testid="dross-3rd-kg-input"
                  type="number"
                  step="0.01"
                  value={formData.dross_3rd_kg}
                  onChange={(e) => setFormData({ ...formData, dross_3rd_kg: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              {renderImageUpload('dross_3rd_image', 'Photo of 3rd Dross')}

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  data-testid="back-button"
                  className="flex-1 h-16 text-xl font-bold bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  data-testid="next-step-button"
                  disabled={!canProceed()}
                  className="flex-1 h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Output
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-6" data-testid="step-title">Pure Lead Output</h2>
              
              <div>
                <Label htmlFor="pure_lead" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pure Lead Weight (KG)
                </Label>
                <Input
                  id="pure_lead"
                  data-testid="pure-lead-kg-input"
                  type="number"
                  step="0.01"
                  value={formData.pure_lead_kg}
                  onChange={(e) => setFormData({ ...formData, pure_lead_kg: e.target.value })}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {renderImageUpload('pure_lead_image', 'Photo of Pure Lead Weight')}

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  data-testid="back-button"
                  className="flex-1 h-16 text-xl font-bold bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  data-testid="submit-entry-button"
                  disabled={!canProceed() || loading}
                  className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}