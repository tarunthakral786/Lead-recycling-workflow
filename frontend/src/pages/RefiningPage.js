import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Camera, ArrowLeft, Plus, X } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RefiningPage({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([{
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
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
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
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (batchIndex, field, file) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = file;
    setBatches(newBatches);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...imagePreviews];
        newPreviews[batchIndex] = { ...newPreviews[batchIndex], [field]: reader.result };
        setImagePreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      
      // Prepare batches data without images
      const batchesData = batches.map(batch => ({
        lead_ingot_kg: parseFloat(batch.lead_ingot_kg),
        lead_ingot_pieces: parseInt(batch.lead_ingot_pieces),
        initial_dross_kg: parseFloat(batch.initial_dross_kg),
        dross_2nd_kg: parseFloat(batch.dross_2nd_kg),
        dross_3rd_kg: parseFloat(batch.dross_3rd_kg),
        pure_lead_kg: parseFloat(batch.pure_lead_kg)
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      
      // Append all images in order
      batches.forEach(batch => {
        form.append('files', batch.lead_ingot_image);
        form.append('files', batch.initial_dross_image);
        form.append('files', batch.dross_2nd_image);
        form.append('files', batch.dross_3rd_image);
        form.append('files', batch.pure_lead_image);
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/refining/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${batches.length} batch(es) saved successfully!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (batchIndex) => {
    const batch = batches[batchIndex];
    if (step === 1) {
      return batch.lead_ingot_kg && batch.lead_ingot_pieces && batch.lead_ingot_image;
    } else if (step === 2) {
      return batch.initial_dross_kg && batch.initial_dross_image && 
             batch.dross_2nd_kg && batch.dross_2nd_image && 
             batch.dross_3rd_kg && batch.dross_3rd_image;
    } else if (step === 3) {
      return batch.pure_lead_kg && batch.pure_lead_image;
    }
    return false;
  };

  const allBatchesCanProceed = () => {
    return batches.every((_, index) => canProceed(index));
  };

  const renderImageUpload = (batchIndex, field, label) => (
    <div>
      <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </Label>
      <label
        htmlFor={`${field}-${batchIndex}`}
        className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer h-48 flex flex-col items-center justify-center gap-3"
        data-testid={`${field}-upload-zone-${batchIndex}`}
      >
        {imagePreviews[batchIndex]?.[field] ? (
          <img src={imagePreviews[batchIndex][field]} alt="Preview" className="h-40 object-contain" />
        ) : (
          <>
            <Camera className="w-12 h-12 text-slate-400" />
            <span className="text-lg font-semibold text-slate-500">Tap to capture</span>
          </>
        )}
      </label>
      <input
        id={`${field}-${batchIndex}`}
        data-testid={`${field}-input-${batchIndex}`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(batchIndex, field, e.target.files[0])}
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
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="refining-title">Refining Process</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es)</p>
            </div>
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

        {/* Batch Forms */}
        {batches.map((batch, batchIndex) => (
          <Card key={batchIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Batch {batchIndex + 1}</h3>
              {batches.length > 1 && (
                <Button
                  onClick={() => removeBatch(batchIndex)}
                  data-testid={`remove-batch-${batchIndex}`}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Lead Ingot Input</h2>
                
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Weight (KG)
                  </Label>
                  <Input
                    data-testid={`lead-ingot-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.lead_ingot_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'lead_ingot_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Pieces
                  </Label>
                  <Input
                    data-testid={`lead-ingot-pieces-input-${batchIndex}`}
                    type="number"
                    value={batch.lead_ingot_pieces}
                    onChange={(e) => handleInputChange(batchIndex, 'lead_ingot_pieces', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0"
                  />
                </div>

                {renderImageUpload(batchIndex, 'lead_ingot_image', 'Photo of Weight')}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Dross Inputs</h2>
                
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Initial Dross (KG)
                  </Label>
                  <Input
                    data-testid={`initial-dross-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.initial_dross_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'initial_dross_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                {renderImageUpload(batchIndex, 'initial_dross_image', 'Photo of Initial Dross')}

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    2nd Dross (KG)
                  </Label>
                  <Input
                    data-testid={`dross-2nd-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.dross_2nd_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'dross_2nd_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                {renderImageUpload(batchIndex, 'dross_2nd_image', 'Photo of 2nd Dross')}

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    3rd Dross (KG)
                  </Label>
                  <Input
                    data-testid={`dross-3rd-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.dross_3rd_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'dross_3rd_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                {renderImageUpload(batchIndex, 'dross_3rd_image', 'Photo of 3rd Dross')}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Pure Lead Output</h2>
                
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Pure Lead Weight (KG)
                  </Label>
                  <Input
                    data-testid={`pure-lead-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.pure_lead_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'pure_lead_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>

                {renderImageUpload(batchIndex, 'pure_lead_image', 'Photo of Pure Lead Weight')}
              </div>
            )}
          </Card>
        ))}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {step > 1 && (
            <Button
              onClick={() => setStep(step - 1)}
              data-testid="back-step-button"
              className="flex-1 h-16 text-xl font-bold bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <>
              <Button
                onClick={addBatch}
                data-testid="add-batch-button"
                className="flex-1 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
              >
                <Plus className="w-6 h-6 mr-2" />
                Add Lead Batch
              </Button>
              <Button
                onClick={() => setStep(step + 1)}
                data-testid="next-step-button"
                disabled={!allBatchesCanProceed()}
                className="flex-1 h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              data-testid="submit-entry-button"
              disabled={!allBatchesCanProceed() || loading}
              className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : `Save ${batches.length} Batch(es)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}