import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Camera, ArrowLeft, Plus, X, Check, ChevronRight } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RefiningPage({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  
  // Each batch tracks its own saved state per step
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
    pure_lead_image: null,
    step1_saved: false,
    step2_saved: false,
    step3_saved: false
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
      pure_lead_image: null,
      step1_saved: false,
      step2_saved: false,
      step3_saved: false
    }]);
    setImagePreviews([...imagePreviews, {}]);
    setCurrentBatchIndex(batches.length);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      const newBatches = batches.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setBatches(newBatches);
      setImagePreviews(newPreviews);
      if (currentBatchIndex >= newBatches.length) {
        setCurrentBatchIndex(newBatches.length - 1);
      }
    }
  };

  const handleFileChange = async (batchIndex, field, file) => {
    if (!file) return;
    
    const compressedFile = await compressImage(file);
    
    const newBatches = [...batches];
    newBatches[batchIndex][field] = compressedFile;
    setBatches(newBatches);

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...imagePreviews];
      newPreviews[batchIndex] = { ...newPreviews[batchIndex], [field]: reader.result };
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(compressedFile);
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  // Check if current step can be saved
  const canSaveCurrentStep = (batchIndex) => {
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

  // Save current step for a batch
  const saveBatchStep = (batchIndex) => {
    const newBatches = [...batches];
    if (step === 1) {
      newBatches[batchIndex].step1_saved = true;
    } else if (step === 2) {
      newBatches[batchIndex].step2_saved = true;
    } else if (step === 3) {
      newBatches[batchIndex].step3_saved = true;
    }
    setBatches(newBatches);
    toast.success(`Batch ${batchIndex + 1} - Step ${step} saved!`);
  };

  // Check if all batches have current step saved
  const allBatchesSavedForCurrentStep = () => {
    if (step === 1) {
      return batches.every(batch => batch.step1_saved);
    } else if (step === 2) {
      return batches.every(batch => batch.step2_saved);
    } else if (step === 3) {
      return batches.every(batch => batch.step3_saved);
    }
    return false;
  };

  // Check if batch step is saved
  const isBatchStepSaved = (batchIndex) => {
    const batch = batches[batchIndex];
    if (step === 1) return batch.step1_saved;
    if (step === 2) return batch.step2_saved;
    if (step === 3) return batch.step3_saved;
    return false;
  };

  // Final submit - save to database
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = batches.map(batch => ({
        lead_ingot_kg: parseFloat(batch.lead_ingot_kg),
        lead_ingot_pieces: parseInt(batch.lead_ingot_pieces),
        initial_dross_kg: parseFloat(batch.initial_dross_kg),
        dross_2nd_kg: parseFloat(batch.dross_2nd_kg),
        dross_3rd_kg: parseFloat(batch.dross_3rd_kg),
        pure_lead_kg: parseFloat(batch.pure_lead_kg)
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      
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

      toast.success(`${batches.length} batch(es) submitted successfully!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
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

  const renderBatchTabs = () => (
    <div className="flex gap-2 mb-6 flex-wrap">
      {batches.map((batch, idx) => (
        <Button
          key={idx}
          onClick={() => setCurrentBatchIndex(idx)}
          data-testid={`batch-tab-${idx}`}
          className={`h-12 px-4 font-bold rounded-lg flex items-center gap-2 ${
            currentBatchIndex === idx
              ? 'bg-orange-600 text-white'
              : isBatchStepSaved(idx)
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          Batch {idx + 1}
          {isBatchStepSaved(idx) && <Check className="w-4 h-4" />}
        </Button>
      ))}
      <Button
        onClick={addBatch}
        data-testid="add-batch-button"
        className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
      >
        <Plus className="w-5 h-5 mr-1" />
        Add Batch
      </Button>
    </div>
  );

  const batch = batches[currentBatchIndex];

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
              <p className="text-base text-slate-600">{batches.length} batch(es) | Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                step === s ? 'bg-orange-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
              data-testid={`step-indicator-${s}`}
            >
              {step > s ? <Check className="w-8 h-8" /> : s}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-lg text-slate-600">
            {step === 1 && 'Enter Lead Ingot details for each batch, save, then proceed'}
            {step === 2 && 'Enter Dross details for each batch, save, then proceed'}
            {step === 3 && 'Enter Pure Lead output for each batch, save, then submit'}
          </p>
        </div>

        {/* Batch Tabs */}
        {renderBatchTabs()}

        {/* Current Batch Form */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-900">Batch {currentBatchIndex + 1}</h3>
              {isBatchStepSaved(currentBatchIndex) && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full flex items-center gap-1">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
            {batches.length > 1 && (
              <Button
                onClick={() => removeBatch(currentBatchIndex)}
                data-testid={`remove-batch-${currentBatchIndex}`}
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
                  data-testid={`lead-ingot-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.lead_ingot_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'lead_ingot_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pieces
                </Label>
                <Input
                  data-testid={`lead-ingot-pieces-input-${currentBatchIndex}`}
                  type="number"
                  value={batch.lead_ingot_pieces}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'lead_ingot_pieces', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0"
                />
              </div>

              {renderImageUpload(currentBatchIndex, 'lead_ingot_image', 'Photo of Weight')}
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
                  data-testid={`initial-dross-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.initial_dross_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'initial_dross_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderImageUpload(currentBatchIndex, 'initial_dross_image', 'Photo of Initial Dross')}

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  2nd Dross (KG)
                </Label>
                <Input
                  data-testid={`dross-2nd-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.dross_2nd_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'dross_2nd_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderImageUpload(currentBatchIndex, 'dross_2nd_image', 'Photo of 2nd Dross')}

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  3rd Dross (KG)
                </Label>
                <Input
                  data-testid={`dross-3rd-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.dross_3rd_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'dross_3rd_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderImageUpload(currentBatchIndex, 'dross_3rd_image', 'Photo of 3rd Dross')}
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
                  data-testid={`pure-lead-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.pure_lead_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'pure_lead_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>

              {renderImageUpload(currentBatchIndex, 'pure_lead_image', 'Photo of Pure Lead Weight')}
            </div>
          )}

          {/* Save Batch Button */}
          {!isBatchStepSaved(currentBatchIndex) && (
            <Button
              onClick={() => saveBatchStep(currentBatchIndex)}
              data-testid={`save-batch-${currentBatchIndex}`}
              disabled={!canSaveCurrentStep(currentBatchIndex)}
              className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-6 h-6 mr-2" />
              Save Batch {currentBatchIndex + 1}
            </Button>
          )}
        </Card>

        {/* Summary of all batches */}
        <Card className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Batch Status for Step {step}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {batches.map((b, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-center ${
                  (step === 1 && b.step1_saved) || (step === 2 && b.step2_saved) || (step === 3 && b.step3_saved)
                    ? 'bg-green-100 border-2 border-green-300'
                    : 'bg-white border-2 border-slate-200'
                }`}
              >
                <p className="font-bold text-slate-900">Batch {idx + 1}</p>
                <p className="text-sm text-slate-600">
                  {(step === 1 && b.step1_saved) || (step === 2 && b.step2_saved) || (step === 3 && b.step3_saved)
                    ? '✓ Saved'
                    : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </Card>

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
            <Button
              onClick={() => setStep(step + 1)}
              data-testid="next-step-button"
              disabled={!allBatchesSavedForCurrentStep()}
              className="flex-1 h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              data-testid="submit-entry-button"
              disabled={!allBatchesSavedForCurrentStep() || loading}
              className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : `Submit ${batches.length} Batch(es)`}
            </Button>
          )}
        </div>

        {!allBatchesSavedForCurrentStep() && (
          <p className="text-center text-slate-500 mt-4">
            Save all batches for Step {step} before proceeding to {step < 3 ? 'next step' : 'submit'}
          </p>
        )}
      </div>
    </div>
  );
}
