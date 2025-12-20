import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft, Plus, X, Info } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RecyclingPage({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([{
    battery_type: 'PP',
    battery_kg: '',
    battery_image: null,
    quantity_received: '',
    remelted_lead_image: null
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      battery_type: 'PP',
      battery_kg: '',
      battery_image: null,
      quantity_received: '',
      remelted_lead_image: null
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = async (batchIndex, field, file) => {
    if (!file) return;
    
    // Compress image before storing
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

  const calculateOutput = (batteryKg, batteryType) => {
    if (!batteryKg) return 0;
    const percentage = batteryType === 'PP' ? 0.605 : 0.58;
    return (parseFloat(batteryKg) * percentage).toFixed(2);
  };

  const calculateReceivable = (batteryKg, batteryType, quantityReceived) => {
    const totalOutput = parseFloat(calculateOutput(batteryKg, batteryType));
    const received = parseFloat(quantityReceived) || 0;
    return (totalOutput - received).toFixed(2);
  };

  const calculateRecoveryPercent = (batteryKg, quantityReceived) => {
    if (!batteryKg || !quantityReceived) return 0;
    return ((parseFloat(quantityReceived) / parseFloat(batteryKg)) * 100).toFixed(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Filter batches that have at least battery input complete (Step 1)
      const completeBatches = batches.filter(batch => 
        batch.battery_kg && batch.battery_image
      );

      if (completeBatches.length === 0) {
        toast.error('Please complete at least one battery input (weight + photo)');
        setLoading(false);
        return;
      }

      const form = new FormData();
      
      const batchesData = completeBatches.map(batch => ({
        battery_type: batch.battery_type,
        battery_kg: parseFloat(batch.battery_kg),
        quantity_received: parseFloat(batch.quantity_received) || 0,
        has_output_image: !!batch.remelted_lead_image
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      
      completeBatches.forEach(batch => {
        form.append('files', batch.battery_image);
        if (batch.remelted_lead_image) {
          form.append('files', batch.remelted_lead_image);
        }
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/recycling/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${completeBatches.length} batch(es) saved successfully!`);
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
      return batch.battery_kg && batch.battery_image;
    } else if (step === 2) {
      return batch.quantity_received && batch.remelted_lead_image;
    }
    return false;
  };

  const anyBatchCanProceed = () => {
    return batches.some((_, index) => canProceed(index));
  };

  const getStep1CompleteCount = () => {
    return batches.filter(batch => batch.battery_kg && batch.battery_image).length;
  };

  const getCompleteCount = () => {
    return batches.filter(batch => 
      batch.battery_kg && batch.battery_image
    ).length;
  };

  const renderImageUpload = (batchIndex, field, label) => (
    <div>
      <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </Label>
      <label
        htmlFor={`${field}-${batchIndex}`}
        className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer h-48 flex flex-col items-center justify-center gap-3"
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
              <h1 className="text-2xl font-bold text-slate-900" data-testid="recycling-title">Battery Recycling</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es) | Step {step}/2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                step === s ? 'bg-green-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
              data-testid={`step-indicator-${s}`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-base font-semibold text-blue-900">Auto-Calculation</p>
              <p className="text-sm text-blue-700">PP Battery: 60.5% output | MC/SMF Battery: 58% output</p>
            </div>
          </div>
        </Card>

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
                <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Battery Input</h2>
                
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Battery Type
                  </Label>
                  <Select
                    value={batch.battery_type}
                    onValueChange={(value) => handleInputChange(batchIndex, 'battery_type', value)}
                  >
                    <SelectTrigger 
                      className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                      data-testid={`battery-type-trigger-${batchIndex}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent data-testid={`battery-type-content-${batchIndex}`}>
                      <SelectItem value="PP" className="text-xl">PP Battery</SelectItem>
                      <SelectItem value="MC/SMF" className="text-xl">MC/SMF Battery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Battery Weight (KG)
                  </Label>
                  <Input
                    data-testid={`battery-kg-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.battery_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'battery_kg', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500"
                    placeholder="0.00"
                  />
                </div>

                {renderImageUpload(batchIndex, 'battery_image', 'Photo of Battery Weight')}

                {/* Auto-calculated output */}
                {batch.battery_kg && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                    <Label className="block text-sm font-bold text-green-700 uppercase tracking-wider mb-2">
                      Expected Remelted Lead Output
                    </Label>
                    <p className="text-4xl font-bold text-green-700" data-testid={`output-display-${batchIndex}`}>
                      {calculateOutput(batch.battery_kg, batch.battery_type)} kg
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Recycling Output</h2>
                
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-sm font-bold text-slate-500 uppercase mb-1">Battery Type</Label>
                      <p className="text-xl font-bold text-slate-900">{batch.battery_type}</p>
                    </div>
                    <div>
                      <Label className="block text-sm font-bold text-slate-500 uppercase mb-1">Input Weight</Label>
                      <p className="text-xl font-bold text-slate-900">{batch.battery_kg} kg</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="block text-sm font-bold text-green-600 uppercase mb-1">Expected Output</Label>
                      <p className="text-3xl font-bold text-green-600">{calculateOutput(batch.battery_kg, batch.battery_type)} kg</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Remelted Lead Received (KG)
                  </Label>
                  <Input
                    data-testid={`quantity-received-input-${batchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.quantity_received}
                    onChange={(e) => handleInputChange(batchIndex, 'quantity_received', e.target.value)}
                    className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500"
                    placeholder="0.00"
                  />
                  <p className="text-sm text-slate-500 mt-2">Enter actual remelted lead quantity received from recycling process</p>
                </div>

                {user.name === 'TT' && batch.battery_kg && batch.quantity_received && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="block text-sm font-bold text-blue-700 uppercase tracking-wider">
                          Scrap Battery Receivable
                        </Label>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">TT ONLY</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-700" data-testid={`receivable-display-${batchIndex}`}>
                        {calculateReceivable(batch.battery_kg, batch.battery_type, batch.quantity_received)} kg
                      </p>
                    </div>

                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="block text-sm font-bold text-purple-700 uppercase tracking-wider">
                          Recovery Percentage
                        </Label>
                        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">TT ONLY</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-700" data-testid={`recovery-percent-display-${batchIndex}`}>
                        {calculateRecoveryPercent(batch.battery_kg, batch.quantity_received)}%
                      </p>
                      <p className="text-sm text-purple-600 mt-2">Recovery from {batch.battery_type} Battery</p>
                    </div>
                  </div>
                )}

                {renderImageUpload(batchIndex, 'remelted_lead_image', 'Photo of Remelted Lead Output')}
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
          {step < 2 ? (
            <>
              <Button
                onClick={handleSubmit}
                data-testid="save-inputs-button"
                disabled={!anyBatchCanProceed() || loading}
                className="flex-1 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
              >
                {loading ? 'Saving...' : `Save ${getStep1CompleteCount()} Input(s)`}
              </Button>
              <Button
                onClick={addBatch}
                data-testid="add-batch-button"
                className="flex-1 h-16 text-xl font-bold bg-slate-600 hover:bg-slate-700 text-white shadow-lg rounded-lg"
              >
                <Plus className="w-6 h-6 mr-2" />
                Add Battery
              </Button>
              <Button
                onClick={() => setStep(step + 1)}
                data-testid="next-step-button"
                disabled={!anyBatchCanProceed()}
                className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step ({getStep1CompleteCount()})
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              data-testid="submit-entry-button"
              disabled={!anyBatchCanProceed() || loading}
              className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : `Save ${getCompleteCount()} Batch(es)`}
            </Button>
          )}
        </div>
        
        {step === 1 && anyBatchCanProceed() && (
          <div className="text-center text-sm text-slate-600 mt-2">
            💡 Save battery inputs now. Output details can be added later.
          </div>
        )}
      </div>
    </div>
  );
}