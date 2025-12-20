import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft, Plus, X } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DrossRecyclingEntryPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([{
    dross_type: 'initial',
    quantity_sent: '',
    high_lead_recovered: '',
    spectro_image: null
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      dross_type: 'initial',
      quantity_sent: '',
      high_lead_recovered: '',
      spectro_image: null
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = async (batchIndex, file) => {
    if (!file) return;
    
    const compressedFile = await compressImage(file);
    
    const newBatches = [...batches];
    newBatches[batchIndex].spectro_image = compressedFile;
    setBatches(newBatches);

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...imagePreviews];
      newPreviews[batchIndex] = { spectro_image: reader.result };
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(compressedFile);
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    // Validate all batches
    const incompleteBatches = batches.filter(b => 
      !b.quantity_sent || !b.high_lead_recovered || !b.spectro_image
    );

    if (incompleteBatches.length > 0) {
      toast.error('Please complete all batch fields');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = batches.map(batch => ({
        dross_type: batch.dross_type,
        quantity_sent: parseFloat(batch.quantity_sent),
        high_lead_recovered: parseFloat(batch.high_lead_recovered)
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      
      batches.forEach(batch => {
        form.append('files', batch.spectro_image);
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/dross-recycling/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${batches.length} batch(es) saved successfully!`);
      navigate('/dross-recycling');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return batches.every(batch => 
      batch.quantity_sent && batch.high_lead_recovered && batch.spectro_image
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dross-recycling')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Add Dross Recycling Entry</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
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

            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Dross Type
                </Label>
                <Select
                  value={batch.dross_type}
                  onValueChange={(value) => handleInputChange(batchIndex, 'dross_type', value)}
                >
                  <SelectTrigger className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial" className="text-xl">Initial Dross</SelectItem>
                    <SelectItem value="2nd" className="text-xl">2nd Dross</SelectItem>
                    <SelectItem value="3rd" className="text-xl">3rd Dross</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quantity Sent for Recycling (KG)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batch.quantity_sent}
                  onChange={(e) => handleInputChange(batchIndex, 'quantity_sent', e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  High Lead Recovered (KG)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batch.high_lead_recovered}
                  onChange={(e) => handleInputChange(batchIndex, 'high_lead_recovered', e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Spectro Report Image
                </Label>
                <label
                  htmlFor={`spectro-${batchIndex}`}
                  className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-yellow-50 hover:border-yellow-300 transition-colors cursor-pointer h-48 flex flex-col items-center justify-center gap-3"
                >
                  {imagePreviews[batchIndex]?.spectro_image ? (
                    <img src={imagePreviews[batchIndex].spectro_image} alt="Preview" className="h-40 object-contain" />
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-slate-400" />
                      <span className="text-lg font-semibold text-slate-500">Tap to capture spectro report</span>
                    </>
                  )}
                </label>
                <input
                  id={`spectro-${batchIndex}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(batchIndex, e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={addBatch}
            data-testid="add-batch-button"
            className="flex-1 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add Another Batch
          </Button>
          <Button
            onClick={handleSubmit}
            data-testid="submit-entry-button"
            disabled={!canSubmit() || loading}
            className="flex-1 h-16 text-xl font-bold bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : `Save ${batches.length} Batch(es)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
